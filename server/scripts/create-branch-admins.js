const { createClient } = require('@supabase/supabase-js');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing Supabase credentials. Check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const adminPassword = 'admin123';
const ownerPassword = 'owner123';

const targets = [
  {
    email: 'owner@yohanns.com',
    password: ownerPassword,
    role: 'owner',
    firstName: 'Owner',
    lastName: 'Account'
  },
  {
    email: 'admin@yohanns.com',
    password: adminPassword,
    role: 'admin',
    firstName: 'Admin',
    lastName: 'HQ',
    branchId: 1,
    branchName: 'SAN PASCUAL (MAIN BRANCH)'
  },
  { email: 'admin.sanpascualmainbranch@yohanns.com', branchId: 1, branchName: 'SAN PASCUAL (MAIN BRANCH)' },
  { email: 'admin.calapanbranch@yohanns.com', branchId: 2, branchName: 'CALAPAN BRANCH' },
  { email: 'admin.muzonbranch@yohanns.com', branchId: 3, branchName: 'MUZON BRANCH' },
  { email: 'admin.lemerybranch@yohanns.com', branchId: 4, branchName: 'LEMERY BRANCH' },
  { email: 'admin.batangascitybranch@yohanns.com', branchId: 5, branchName: 'BATANGAS CITY BRANCH' },
  { email: 'admin.bauanbranch@yohanns.com', branchId: 6, branchName: 'BAUAN BRANCH' },
  { email: 'admin.calacabranch@yohanns.com', branchId: 7, branchName: 'CALACA BRANCH' },
  { email: 'admin.pinamalayanbranch@yohanns.com', branchId: 8, branchName: 'PINAMALAYAN BRANCH' },
  { email: 'admin.rosariobranch@yohanns.com', branchId: 9, branchName: 'ROSARIO BRANCH' }
].map((admin) => ({
  password: admin.password || adminPassword,
  role: admin.role || 'admin',
  firstName: admin.firstName || 'Admin',
  lastName: admin.lastName || (admin.branchName ? admin.branchName : 'Account'),
  ...admin
}));

async function findUserByEmail(email) {
  let page = 1;
  const perPage = 1000;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) {
      throw error;
    }

    const users = data?.users || [];
    const found = users.find((user) => user.email?.toLowerCase() === email.toLowerCase());
    if (found) {
      return found;
    }

    if (!users.length || users.length < perPage) {
      return null;
    }

    page += 1;
  }
}

async function upsertAdminAccount(target) {
  const userMetadata = {
    role: target.role,
    branch_id: target.branchId ?? null,
    branch_name: target.branchName ?? null,
    first_name: target.firstName,
    last_name: target.lastName
  };

  try {
    const { data, error } = await supabase.auth.admin.createUser({
      email: target.email,
      password: target.password,
      email_confirm: true,
      user_metadata: userMetadata
    });

    if (error) {
      throw error;
    }

    return { created: true, user: data.user };
  } catch (error) {
    if ((error.message || '').toLowerCase().includes('already registered')) {
      const existing = await findUserByEmail(target.email);
      if (!existing) {
        throw error;
      }

      const { data, error: updateError } = await supabase.auth.admin.updateUserById(existing.id, {
        password: target.password,
        user_metadata: userMetadata
      });

      if (updateError) {
        throw updateError;
      }

      return { created: false, updated: true, user: data.user };
    }

    throw error;
  }
}

async function main() {
  console.log('🚀 Creating branch admin accounts via Supabase Admin API...\n');

  for (const target of targets) {
    process.stdout.write(`• ${target.email} ... `);
    try {
      const result = await upsertAdminAccount(target);
      if (result.created) {
        console.log('created ✅');
      } else if (result.updated) {
        console.log('updated 🔄');
      } else {
        console.log('skipped');
      }
    } catch (error) {
      console.error(`failed ❌ (${error.message})`);
    }
  }

  console.log('\n✅ Done. These accounts will now appear in /api/admin/users and the admin UI.');
}

if (require.main === module) {
  main().catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });
}

module.exports = { upsertAdminAccount };