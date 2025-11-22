const { createClient } = require('@supabase/supabase-js');
const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing Supabase credentials. Check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const DATABASE_URL = process.env.SUPABASE_POOLER_URL || process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ Missing Supabase database connection string. Set SUPABASE_POOLER_URL or DATABASE_URL.');
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});
const DEFAULT_PASSWORD = process.env.ARTIST_DEFAULT_PASSWORD || 'Artist123!';
const TOTAL_ARTISTS = Number(process.env.ARTIST_TOTAL_COUNT || 21);
const RESET_ARTISTS = process.env.RESET_ARTISTS === 'true';

const artistSeeds = Array.from({ length: TOTAL_ARTISTS }, (_, index) => {
  const number = index + 1;
  const artistName = `Artist ${number}`;
  return {
    email: `artist${number}@yohanns.com`,
    password: DEFAULT_PASSWORD,
    artistName,
    fullName: artistName,
    role: 'artist'
  };
});

async function purgeExistingArtistAccounts() {
  console.log('🧹 RESET_ARTISTS flag enabled — removing existing artist accounts before seeding...');

  const { rows } = await pool.query(
    "SELECT id, email FROM auth.users WHERE email LIKE 'artist%@yohanns.com'"
  );

  if (!rows.length) {
    console.log('   • No existing artist accounts found, nothing to purge.');
    return;
  }

  const userIds = rows.map((row) => row.id);

  console.log(`   • Deleting ${userIds.length} artist profile rows...`);
  const { error: profileDeleteError } = await supabase
    .from('artist_profiles')
    .delete()
    .in('user_id', userIds);

  if (profileDeleteError) {
    console.error('   ❌ Failed to delete artist_profiles rows:', profileDeleteError.message);
  } else {
    console.log('   ✅ Removed related artist_profiles rows');
  }

  console.log('   • Removing users from Supabase Auth...');
  for (const row of rows) {
    try {
      await supabase.auth.admin.deleteUser(row.id);
      console.log(`     - Deleted ${row.email}`);
    } catch (error) {
      console.error(`     - Failed to delete ${row.email}:`, error.message);
    }
  }

  console.log('✅ Artist accounts purged. Proceeding with fresh seed...\n');
}

async function findUserByEmail(email) {
  const queryText = `
    SELECT id, email, raw_user_meta_data
    FROM auth.users
    WHERE lower(email) = lower($1)
    LIMIT 1;
  `;

  try {
    const { rows } = await pool.query(queryText, [email]);
    if (!rows.length) {
      return null;
    }

    const row = rows[0];
    return {
      id: row.id,
      email: row.email,
      user_metadata: row.raw_user_meta_data || {}
    };
  } catch (error) {
    console.error(`❌ Database lookup error for ${email}:`, error);
    throw new Error(`Database error checking email (${email}): ${error.message}`);
  }
}

async function ensureArtistProfile(user, artist) {
  const displayName = artist.artistName || artist.fullName || artist.email.split('@')[0];

  const { data: existingProfile, error: profileError } = await supabase
    .from('artist_profiles')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (profileError && profileError.code !== 'PGRST116') {
    throw new Error(`Failed to check artist profile (${artist.email}): ${profileError.message}`);
  }

  if (!existingProfile) {
    const { error: insertError } = await supabase.from('artist_profiles').insert({
      user_id: user.id,
      artist_name: displayName,
      bio: 'Professional design layout specialist',
      commission_rate: 12.0,
      rating: 0,
      is_verified: false,
      is_active: true
    });

    if (insertError) {
      throw new Error(`Failed to create artist profile (${artist.email}): ${insertError.message}`);
    }

    return { created: true };
  }

  const { error: updateError } = await supabase
    .from('artist_profiles')
    .update({
      artist_name: displayName,
      is_active: true
    })
    .eq('id', existingProfile.id);

  if (updateError) {
    throw new Error(`Failed to update artist profile (${artist.email}): ${updateError.message}`);
  }

  return { created: false };
}

async function upsertArtistAccount(artist) {
  const userMetadata = {
    role: artist.role,
    artist_name: artist.artistName,
    full_name: artist.fullName
  };

  const existing = await findUserByEmail(artist.email);

  if (existing) {
    const { data, error: updateError } = await supabase.auth.admin.updateUserById(existing.id, {
      password: artist.password,
      user_metadata: userMetadata
    });

    if (updateError) {
      console.error(`❌ Supabase update error for ${artist.email}:`, updateError);
      throw new Error(`Database error loading user (${artist.email}): ${updateError.message}`);
    }

    return { created: false, updated: true, user: data.user || existing };
  }

  try {
    const { data, error } = await supabase.auth.admin.createUser({
      email: artist.email,
      password: artist.password,
      email_confirm: true,
      user_metadata: userMetadata
    });

    if (error) {
      console.error(`❌ Supabase create error for ${artist.email}:`, error);
      throw new Error(`Database error creating user (${artist.email}): ${error.message}`);
    }

    return { created: true, user: data.user };
  } catch (error) {
    throw error;
  }
}

async function createArtistAccounts() {
  if (RESET_ARTISTS) {
    await purgeExistingArtistAccounts();
  }

  console.log(`🎨 Ensuring ${TOTAL_ARTISTS} artist accounts exist via Supabase Admin API...\n`);

  let created = 0;
  let updated = 0;
  const failures = [];

  for (const artist of artistSeeds) {
    process.stdout.write(`• ${artist.email} ... `);
    try {
      const result = await upsertArtistAccount(artist);
      const user = result.user;

      await ensureArtistProfile(user, artist);

      if (result.created) {
        created += 1;
        console.log('created ✅');
      } else if (result.updated) {
        updated += 1;
        console.log('updated 🔄');
      } else {
        console.log('skipped');
      }

      await new Promise((resolve) => setTimeout(resolve, 75));
    } catch (error) {
      failures.push({ email: artist.email, message: error.message });
      console.log(`failed ❌ (${error.message})`);
    }
  }

  console.log('\n📊 Summary:');
  console.log(`   ✅ Created: ${created}`);
  console.log(`   🔄 Updated: ${updated}`);
  console.log(`   ⚠️ Failed: ${failures.length}`);

  if (failures.length) {
    console.log('\nDetails:');
    failures.forEach((failure) => console.log(`   - ${failure.email}: ${failure.message}`));
  }

  console.log('\n📝 Artists can sign in with:');
  console.log('   • Emails: artist1@yohanns.com – artist21@yohanns.com');
  console.log(`   • Password: ${DEFAULT_PASSWORD}`);

  console.log('\n✅ Artist provisioning complete.');
}

if (require.main === module) {
  createArtistAccounts().catch((error) => {
    console.error('❌ Error creating artist accounts:', error.message);
    process.exit(1);
  });
}

module.exports = createArtistAccounts;
