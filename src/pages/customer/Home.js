import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import Hero from '../../components/customer/Hero';
import ProductCategories from '../../components/customer/ProductCategories';
import CustomDesign from '../../components/customer/CustomDesign';
import Newsletter from '../../components/customer/Newsletter';

const Home = () => {
  const [activeCategory, setActiveCategory] = useState('jerseys');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchParams] = useSearchParams();

  // Read search query from URL params
  useEffect(() => {
    const query = searchParams.get('search');
    if (query) {
      setSearchQuery(decodeURIComponent(query));
    }
  }, [searchParams]);

  return (
    <>
      <Hero />
      <ProductCategories 
        activeCategory={activeCategory} 
        setActiveCategory={setActiveCategory}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
      />
      <CustomDesign />
      <Newsletter />
    </>
  );
};

export default Home; 