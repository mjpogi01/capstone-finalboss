import React, { useEffect, useState } from 'react';
import './Hero.css';
import slide1a from '../../images/Slide/1a.png';
import slide1b from '../../images/Slide/1b.png';
import slide1c from '../../images/Slide/1c.png';
import ProtectedAction from '../ProtectedAction';
import { useModal } from '../../contexts/ModalContext';
import ProductListModal from './ProductListModal';
import BranchSelectModal from './BranchSelectModal';

const Hero = () => {
	const slides = [slide1a, slide1b, slide1c];
	const [current, setCurrent] = useState(0);
	const [showProductList, setShowProductList] = useState(false);
	const [showBranchSelect, setShowBranchSelect] = useState(false);
	const { openSignIn } = useModal();

	useEffect(() => {
		const id = setInterval(() => {
			setCurrent((prev) => (prev + 1) % slides.length);
		}, 4000);
		return () => clearInterval(id);
	}, [slides.length]);

	return (
		<section className="hero">
			<div className="hero-content">
				<div className="hero-text">
					<h1 className="hero-title">
						Gear Up for Greatness!
					</h1>
					<h2 className="hero-subtitle">
						<span className="highlight">Elevate Your Game</span> With <span className="highlight">Premium</span>
						<br />
						<span className="highlight">Sportswear!</span>
					</h2>
					<p className="hero-description">
						Yohann's Sportswear House is your one-stop shop for quality 
						sportswear, custom jerseys,uniforms, and accessories like tote bags,
						umbrellas, and towels. Trusted by teams, clubs, and organizations worldwide
					</p>
					<div className="hero-buttons">
						<ProtectedAction
							onAuthenticated={() => {
								// Open the product list modal
								setShowProductList(true);
							}}
							onUnauthenticated={() => {
								// Show sign in modal
								openSignIn();
							}}
						>
							<button className="btn btn-primary">SHOP NOW</button>
						</ProtectedAction>
						<button 
							className="btn btn-secondary"
							onClick={() => setShowBranchSelect(true)}
						>
							INQUIRE NOW
						</button>
					</div>
				</div>
				
				<div className="hero-image">
					<img src={slides[current]} alt={`Slide ${current + 1}`} className="hero-photo" />
				</div>
			</div>

		{/* Product List Modal */}
		<ProductListModal 
			isOpen={showProductList} 
			onClose={() => setShowProductList(false)} 
		/>

		{/* Branch Select Modal */}
		<BranchSelectModal 
			isOpen={showBranchSelect} 
			onClose={() => setShowBranchSelect(false)} 
		/>
	</section>
);
};

export default Hero;