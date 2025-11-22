import React from 'react';
import ArtistRegistration from '../components/admin/ArtistRegistration';
import './ArtistSetup.css';

const ArtistSetup = () => {
  return (
    <div className="artist-setup">
      <div className="artist-setup-header">
        <h1>🎨 Artist Account Setup</h1>
        <p>Create artist accounts for the design team</p>
      </div>
      
      <ArtistRegistration />
      
      <div className="artist-setup-instructions">
        <h3>📋 Setup Instructions</h3>
        <div className="instruction-steps">
          <div className="step">
            <div className="step-number">1</div>
            <div className="step-content">
              <h4>Create Test Account</h4>
              <p>First, create a test account to verify everything works</p>
              <code>testartist@yohanns.com / Test123!</code>
            </div>
          </div>
          
          <div className="step">
            <div className="step-number">2</div>
            <div className="step-content">
              <h4>Test Login</h4>
              <p>Try logging in with the test account to verify artist dashboard access</p>
            </div>
          </div>
          
          <div className="step">
            <div className="step-number">3</div>
            <div className="step-content">
              <h4>Create All Artists</h4>
              <p>Create accounts for artist1@yohanns.com through artist20@yohanns.com</p>
              <p><strong>Password for all:</strong> Artist123!</p>
            </div>
          </div>
        </div>
        
        <div className="alternative-method">
          <h4>🔄 Alternative Method</h4>
          <p>You can also create accounts directly in Supabase Dashboard:</p>
          <ol>
            <li>Go to Supabase Dashboard → Authentication → Users</li>
            <li>Click "Add User"</li>
            <li>Enter email, password, and user metadata</li>
            <li>Set user metadata to: <code>{"role": "artist", "artist_name": "Artist Name"}</code></li>
          </ol>
        </div>
      </div>
    </div>
  );
};

export default ArtistSetup;
