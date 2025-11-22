import React from 'react';
import { FaTimes, FaFacebookF } from 'react-icons/fa';
import './BranchSelectModal.css';

const BranchSelectModal = ({ isOpen, onClose }) => {
  // Branch data with Facebook page links - Each branch has its specific FB page
  const branches = [
    {
      id: 1,
      name: 'BATANGAS CITY BRANCH',
      address: 'Unit 1 Casa Buena Building, P.Burgos ST. EXT Calicanto, 4200 Batangas',
      facebook: 'https://www.facebook.com/profile.php?id=100088691090349'
    },
    {
      id: 2,
      name: 'BAUAN BRANCH',
      address: 'J.P Rizal St. Poblacion, Bauan Batangas',
      facebook: 'https://www.facebook.com/profile.php?id=61578740126566'
    },
    {
      id: 3,
      name: 'SAN PASCUAL (MAIN BRANCH)',
      address: 'Villa Maria Subdivision Sambat, San Pascual, 4204 Batangas',
      facebook: 'https://www.facebook.com/princeyohannsportswear'
    },
    {
      id: 4,
      name: 'CALAPAN BRANCH',
      address: 'Unit 2, Ground Floor Basa Bldg., Infantado Street, Brgy. San Vicente West Calapan City, 5200 Oriental Mindoro',
      facebook: 'https://www.facebook.com/calapan.yohanns'
    },
    {
      id: 5,
      name: 'PINAMALAYAN BRANCH',
      address: 'Mabini St. Brgy. Marfrancisco, Pinamalayan, Oriental Mindoro, Philippines',
      facebook: 'https://www.facebook.com/profile.php?id=61566315711120'
    },
    {
      id: 6,
      name: 'MUZON BRANCH',
      address: 'Barangay Muzon, San Luis, 4226 Batangas',
      facebook: 'https://www.facebook.com/profile.php?id=100084914692738'
    },
    {
      id: 7,
      name: 'LEMERY BRANCH',
      address: 'Miranda Bldg, Illustre Ave., Brgy. District III 4209 Lemery Batangas',
      facebook: 'https://www.facebook.com/profile.php?id=61565602109412'
    },
    {
      id: 8,
      name: 'ROSARIO BRANCH',
      address: 'Brgy. D, Rosario, Batangas, Rosario, Philippines',
      facebook: 'https://web.facebook.com/profile.php?id=61572622020475'
    },
    {
      id: 9,
      name: 'CALACA BRANCH',
      address: 'Block D-8 Calaca Public Market, Poblacion 4, Calaca City, Philippines',
      facebook: 'https://www.facebook.com/profile.php?id=100095084529081'
    }
  ];

  const handleFacebookClick = (facebookUrl) => {
    window.open(facebookUrl, '_blank', 'noopener,noreferrer');
  };

  const handleMainPageClick = () => {
    // Open main Facebook page (San Pascual Main Branch)
    window.open('https://www.facebook.com/princeyohannsportswear', '_blank', 'noopener,noreferrer');
  };

  if (!isOpen) return null;

  return (
    <div className="branch-select-overlay" onClick={onClose}>
      <div className="branch-select-modal" onClick={(e) => e.stopPropagation()}>
        {/* Close Button */}
        <button className="branch-select-close" onClick={onClose} aria-label="Close">
          <FaTimes />
        </button>

        {/* Header */}
        <div className="branch-select-header">
          <h2 className="branch-select-title">Select Your Branch</h2>
          <p className="branch-select-description">
            To better assist you, please choose your nearest branch. We'll take you directly to our Facebook Page for your inquiries. 📨
          </p>
        </div>

        {/* Branch Cards */}
        <div className="branch-select-content">
          {branches.map((branch, index) => (
            <div key={branch.id} className="branch-card" style={{ animationDelay: `${index * 0.1}s` }}>
              <div className="branch-card-header">
                <h3 className="branch-card-title">{branch.name}</h3>
                <p className="branch-card-address">{branch.address}</p>
              </div>
              <button 
                className="branch-facebook-btn"
                onClick={() => handleFacebookClick(branch.facebook)}
                aria-label={`Visit ${branch.name} Facebook page`}
              >
                <FaFacebookF className="fb-icon" />
                Visit Facebook Page
              </button>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="branch-select-footer">
          <p className="branch-select-footer-text">
            Can't find your branch? Send us a message on our main page!
          </p>
          <button 
            className="branch-main-page-btn"
            onClick={handleMainPageClick}
          >
            Message Main Page
          </button>
        </div>
      </div>
    </div>
  );
};

export default BranchSelectModal;

