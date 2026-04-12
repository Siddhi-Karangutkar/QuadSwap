import { useState, useEffect } from 'react';
import { 
  ShoppingBag, ArrowRightLeft, Search, MessageCircle, MapPin, 
  SearchCheck, CheckCircle2, ShieldCheck, HeartPulse, Sparkles, 
  ChevronRight, Twitter, Instagram, Linkedin, Send,
  Sun, Moon, Book, Laptop, Bike, Calculator, Headphones, Image as ImageIcon
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import '../index.css';
import heroImage from '../assets/hero_campus_essentials.png';

const itemsData = [
  {
    id: 1,
    title: 'Symphony Cooler',
    price: '₹1200',
    type: 'Sell',
    condition: 'Good',
    conditionClass: 'condition-good',
    distance: '200m away',
    user: 'Gautam',
    verified: true,
    image: '/images/cooler.png'
  },
  {
    id: 2,
    title: 'Engineering Mathematics Vol 2',
    price: '₹300',
    type: 'Sell',
    condition: 'Fair',
    conditionClass: 'condition-fair',
    distance: 'DMCE Campus',
    user: 'Priya',
    verified: true,
    image: '/images/books.png'
  },
  {
    id: 3,
    title: 'Study Table (Wooden)',
    price: '₹200/mo',
    type: 'Rent',
    condition: 'New',
    conditionClass: 'condition-new',
    distance: '1.2km away',
    user: 'Rahul',
    verified: false,
    image: '/images/table.png'
  },
  {
    id: 4,
    title: 'Drafting Board (A1 Size)',
    price: '₹800',
    type: 'Sell',
    condition: 'Good',
    conditionClass: 'condition-good',
    distance: '500m away',
    user: 'Aman',
    verified: true,
    image: '/images/drafting.png'
  }
];

const tickerData = [
  "Someone just bought a Bajaj Cooler 2 minutes ago! 🔥",
  "New Room Decor just posted in Sector 2 🏠",
  "Aryan accepted a rental proposal for Mini Fridge ❄️",
  "Fresh Engineering Graphics Drafter available in PG Gate 📏",
  "5 new students joined the DMCE Campus board 🎓",
  "Successfully swapped: Scientific Calculator for Lab Coat 🧪",
  "Rohan just listed a Gaming Chair for rent 🪑",
  "Verified: 3 new sellers just joined from Sector 5 ✅"
];

// Campus Live Ticker Component
const LiveTicker = ({ dynamicData }) => {
  const displayData = dynamicData && dynamicData.length > 0 ? dynamicData : tickerData;
  return (
    <div className="live-ticker-container">
      <div className="ticker-wrapper">
        {[...displayData, ...displayData].map((text, i) => (
          <div key={i} className="ticker-item">
            <div className="live-indicator">
              <div className="pulse-dot"></div> Live
            </div>
            <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{text}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// Premium Hero Illustration Component
const HeroIllustration = () => (
  <div className="hero-illustration-wrapper">
    <svg viewBox="0 0 500 500" fill="none" xmlns="http://www.w3.org/2000/svg" className="hero-svg">
      {/* Background Glows */}
      <circle cx="250" cy="250" r="150" fill="url(#paint0_radial)" opacity="0.4" />
      <circle cx="400" cy="100" r="80" fill="url(#paint1_radial)" opacity="0.2" />
      
      {/* Decorative Floating Elements (SVG Shapes) */}
      <rect x="350" y="50" width="40" height="40" rx="12" fill="var(--primary)" opacity="0.1" transform="rotate(15 350 50)" />
      <circle cx="100" cy="400" r="20" fill="var(--accent)" opacity="0.1" />
      
      <defs>
        <radialGradient id="paint0_radial" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(250 250) rotate(90) scale(150)">
          <stop stopColor="var(--primary)" />
          <stop offset="1" stopColor="var(--primary)" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="paint1_radial" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(400 100) rotate(90) scale(80)">
          <stop stopColor="var(--accent)" />
          <stop offset="1" stopColor="var(--accent)" stopOpacity="0" />
        </radialGradient>
      </defs>
    </svg>
    
    {/* High-Impact Mockup Cards Layout */}
    <div className="illustration-overlay">
      <div className="glass-card main-mockup float-premium">
        <div className="mockup-header">
          <div className="dot"></div>
          <div className="dot"></div>
          <div className="dot"></div>
        </div>
        <div className="mockup-content p-0 overflow-hidden">
          <img 
            src={heroImage} 
            alt="Campus Essentials" 
            className="w-full h-auto block" 
          />
        </div>
      </div>
      
      {/* Floating Category Badges */}
      <div className="floating-asset asset-1 float-delayed">
        <Book size={24} className="text-amber-500" />
        <span>Textbooks</span>
      </div>
      <div className="floating-asset asset-2 float-premium">
        <Bike size={24} className="text-indigo-500" />
        <span>Cycles</span>
      </div>
      <div className="floating-asset asset-3 float-delayed">
        <Laptop size={24} className="text-blue-500" />
        <span>Laptops</span>
      </div>
      <div className="floating-asset asset-4 float-premium">
        <Calculator size={24} className="text-emerald-500" />
        <span>Calculator</span>
      </div>
      <div className="floating-asset asset-5 float-delayed">
        <Headphones size={24} className="text-rose-500" />
        <span>Audio Gear</span>
      </div>
    </div>
  </div>
);

function App() {
  const [activeTab, setActiveTab] = useState('buy');
  const [mounted, setMounted] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
  const [dynamicTicker, setDynamicTicker] = useState([]);
  const [logoClicks, setLogoClicks] = useState(0);
  const [lastClickTime, setLastClickTime] = useState(0);
  const navigate = useNavigate();

  const handleLogoClick = () => {
    const now = Date.now();
    if (now - lastClickTime < 2000) {
      const newCount = logoClicks + 1;
      setLogoClicks(newCount);
      if (newCount === 5) {
        navigate('/admin-login');
      }
    } else {
      setLogoClicks(1);
    }
    setLastClickTime(now);
  };

  const fetchLiveActivity = async () => {
    try {
      // 1. Fetch recent items
      const { data: recentItems } = await supabase
        .from('items')
        .select('title, category, pickup_location, created_at')
        .order('created_at', { ascending: false })
        .limit(5);

      // 2. Fetch recent accepted proposals (simulating "Sales")
      const { data: recentSales } = await supabase
        .from('proposals')
        .select('offered_price, status, items(title)')
        .eq('status', 'Accepted')
        .order('created_at', { ascending: false })
        .limit(3);

      const items = (recentItems || []).map(item => `New ${item.title} just posted in ${item.pickup_location || 'Campus'}! 🏠`);
      const sales = (recentSales || []).map(sale => `Someone just bought a ${sale.items?.title || 'item'} via secure pay! 🔥`);
      
      const combined = [...items, ...sales];
      if (combined.length > 0) setDynamicTicker(combined);
    } catch (err) {
      console.error("Ticker fetch error:", err);
    }
  };

  useEffect(() => {
    fetchLiveActivity();
    // Refresh ticker every 5 minutes
    const interval = setInterval(fetchLiveActivity, 300000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    setMounted(true);
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const toggleTheme = () => setTheme(theme === 'light' ? 'dark' : 'light');

  const scrollToSection = (e, id) => {
    e.preventDefault();
    const element = document.getElementById(id);
    if (element) {
      const offset = 80; // Navbar height
      const bodyRect = document.body.getBoundingClientRect().top;
      const elementRect = element.getBoundingClientRect().top;
      const elementPosition = elementRect - bodyRect;
      const offsetPosition = elementPosition - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  };

  const filteredItems = itemsData.filter(item => {
    if (activeTab === 'buy') return item.type === 'Sell';
    return item.type === 'Rent';
  });

  return (
    <div className="app-container">
      {/* Glassmorphism Navbar */}
      <nav className={`navbar ${scrolled ? 'scrolled' : ''}`}>
        <div className="container flex justify-between items-center">
          <div className="nav-brand" onClick={handleLogoClick} style={{ cursor: 'pointer' }}>
            <ShoppingBag size={32} />
            <span>QuadSwap</span>
          </div>
          <div className="nav-links">
            <a href="#marketplace" onClick={(e) => scrollToSection(e, 'marketplace')} className="nav-link">Marketplace</a>
            <a href="#how-it-works" onClick={(e) => scrollToSection(e, 'how-it-works')} className="nav-link">How it Works</a>
            <a href="#features" onClick={(e) => scrollToSection(e, 'features')} className="nav-link">Features</a>
            <div className="flex gap-4 ml-4 items-center">
              <button 
                onClick={toggleTheme}
                className="theme-toggle-btn"
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '10px',
                  padding: '8px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'inherit',
                  transition: 'all 0.3s ease'
                }}
              >
                {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
              </button>
              <button onClick={() => navigate('/login')} className="btn btn-outline" style={{ padding: '0.5rem 1.25rem' }}>Log In</button>
              <button onClick={() => navigate('/signup')} className="btn btn-primary" style={{ padding: '0.5rem 1.25rem' }}>Sign Up</button>
            </div>
          </div>
        </div>
      </nav>

      <LiveTicker dynamicData={dynamicTicker} />

      {/* Advanced Hero Section */}
      <header className="hero">
        <div className="hero-glow"></div>
        <div className="hero-bg">
          <div className="gradient-blob blob-1"></div>
          <div className="gradient-blob blob-2"></div>
        </div>
        
        <div className="container hero-layout">
          <div className="hero-content">
            <div className="badge animate-reveal">
              <Sparkles size={16} className="text-secondary" /> 
              <span>Over 1,000+ Students Joined</span>
            </div>
            <h1 className="hero-title animate-reveal delay-100">
              Buy, Sell & Rent <br />
              <span className="gradient-text">Within Your Campus</span>
            </h1>
            <p className="hero-subtitle animate-slide-up delay-200">
              Ditch the WhatsApp groups. Find semester books, coolers, and essentials securely from verified students living nearby. No stress, just swaps.
            </p>
            
            <div className="flex gap-4 animate-reveal delay-300">
              <button onClick={() => navigate('/login')} className="btn btn-primary btn-glow">
                <Search size={20} /> Browse Items
              </button>
              <button onClick={() => navigate('/signup')} className="btn btn-secondary glass-btn">
                <ArrowRightLeft size={20} /> Post an Ad
              </button>
            </div>

            <div className="hero-stats animate-reveal delay-400">
              <div className="stat-item">
                <h4>10k+</h4>
                <p>Verified Students</p>
              </div>
              <div className="stat-item">
                <h4>50k+</h4>
                <p>Items Swapped</p>
              </div>
              <div className="stat-item">
                <h4>15+</h4>
                <p>Campuses Live</p>
              </div>
            </div>
          </div>

          <div className="hero-visual animate-reveal delay-200">
            <HeroIllustration />
            
            {/* Real-time Activity Overlays */}
            <div className="hero-floating-card card-tl float-delayed">
              <div className="floating-card-icon bg-green-500">
                <CheckCircle2 size={18} />
              </div>
              <div className="floating-card-text">
                <span>Verified Deal</span>
                <strong>Apple iPad Pro</strong>
              </div>
            </div>

            <div className="hero-floating-card card-br float-premium">
              <div className="floating-card-icon bg-amber-500">
                <Sparkles size={18} />
              </div>
              <div className="floating-card-text">
                <span>New Arrival</span>
                <strong>Gym Weights</strong>
              </div>
            </div>

            <div className="hero-floating-card card-bottom float-delayed" style={{ animationDelay: '1.5s' }}>
              <div className="floating-card-icon bg-indigo-500">
                <ImageIcon size={18} />
              </div>
              <div className="floating-card-text">
                <span>Dorm Decor</span>
                <strong>Fairy Lights</strong>
              </div>
            </div>
          </div>
        </div>

        <div className="floating-shape shape-1"></div>
        <div className="floating-shape shape-2"></div>
      </header>

      {/* Interactive Marketplace Section */}
      <section id="marketplace" className="items-section">
        <div className="container">
          <h2 className="section-title">Discover Local Essentials</h2>
          <p className="section-subtitle">Toggle below to find items for sale or available for rent near your location.</p>
          
          <div className="text-center">
            <div className="toggle-wrapper animate-slide-up">
              <div className={`toggle-slider ${activeTab === 'rent' ? 'right' : ''}`}></div>
              <button 
                className={`toggle-btn ${activeTab === 'buy' ? 'active' : ''}`}
                onClick={() => setActiveTab('buy')}
              >
                Buy Items
              </button>
              <button 
                className={`toggle-btn ${activeTab === 'rent' ? 'active' : ''}`}
                onClick={() => setActiveTab('rent')}
              >
                Rent Items
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {filteredItems.map((item, index) => (
              <div 
                key={item.id} 
                className={`item-card ${mounted ? 'visible' : ''}`}
                style={{ transitionDelay: `${index * 150}ms` }}
              >
                <div className="distance-badge">
                  <MapPin size={14} /> {item.distance}
                </div>
                <div className="item-image-wrapper">
                  <img src={item.image} alt={item.title} className="item-image" />
                  <div className="card-overlay"></div>
                </div>
                <div className="item-details">
                  <div className="item-header">
                    <h3 className="item-title">{item.title}</h3>
                    <span className={`condition-chip ${item.conditionClass}`}>
                      {item.condition}
                    </span>
                  </div>
                  <div className="item-price mb-3">{item.price}</div>
                  
                  <div className="user-info">
                    <div className="avatar">{item.user.charAt(0)}</div>
                    <div className="user-name flex-1">
                      {item.user}
                      <span title={item.verified ? "Verified Student" : "Pending Verification"}>
                        <CheckCircle2 
                          className="verified-icon" 
                          size={12} 
                          style={{ 
                            color: item.verified ? 'var(--success)' : 'var(--text-tertiary)',
                            marginLeft: '4px'
                          }} 
                        />
                      </span>
                    </div>
                    <button onClick={() => navigate('/login')} className="chat-btn" title="Chat with Seller">
                      <MessageCircle size={20} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {filteredItems.length === 0 && (
              <div className="col-span-4 text-center py-12">
                <ShoppingBag size={48} className="mx-auto text-gray-300 mb-4" />
                <h3 className="text-xl font-bold text-gray-700">No items available</h3>
                <p className="text-gray-500">Be the first to post a rental item in your area!</p>
              </div>
            )}
          </div>
          
          <div className="text-center mt-20">
            <button onClick={() => navigate('/login')} className="btn btn-outline">
              View All Items <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </section>

      {/* New Professional Process Section */}
      <section id="how-it-works" className="py-24 relative overflow-hidden">
        <div className="container relative z-10">
          <div className="section-header-glass animate-reveal">
            <h2 className="section-title mb-4">How QuadSwap Works</h2>
            <p className="text-lg text-gray-500">The most seamless way to trade essentials within your campus ecosystem.</p>
          </div>
          
          <div className="process-grid">
            <div className="process-card animate-reveal delay-100">
              <div className="step-number">01</div>
              <div className="process-icon">
                <SearchCheck size={32} />
              </div>
              <h3 className="text-2xl font-bold mb-4">List Your Item</h3>
              <p className="text-gray-500 leading-relaxed">Simply snap a photo, set your price, and list. Our campus-specific filtering ensures only nearby students see your ad.</p>
            </div>
            
            <div className="process-card animate-reveal delay-200">
              <div className="step-number">02</div>
              <div className="process-icon">
                <MessageCircle size={32} />
              </div>
              <h3 className="text-2xl font-bold mb-4">Secure Connection</h3>
              <p className="text-gray-500 leading-relaxed">Direct message verified students through our secure chat. No need to share your personal phone number or join cluttered groups.</p>
            </div>
            
            <div className="process-card animate-reveal delay-300">
              <div className="step-number">03</div>
              <div className="process-icon">
                <ArrowRightLeft size={32} />
              </div>
              <h3 className="text-2xl font-bold mb-4">Meet & Swap</h3>
              <p className="text-gray-500 leading-relaxed">Coordinate a quick meetup at the campus library, canteen, or gate. Verify the item in person and complete the transaction safely.</p>
            </div>
          </div>
        </div>
      </section>

      {/* New Student Testimonials Section */}
      <section className="py-24 bg-opacity-50">
        <div className="container">
          <div className="text-center mb-16 animate-reveal">
            <h2 className="section-title">Loved by 10,000+ Students</h2>
            <p className="section-subtitle">Real stories from students who've transformed their campus life.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="testimonial-card animate-reveal delay-100">
              <p className="testimonial-text text-gray-600">"QuadSwap saved my semester! I got all my engineering textbooks for 1/4th the price, and the seller was just two blocks away in the same hostel."</p>
              <div className="testimonial-author">
                <div className="testimonial-avatar">AS</div>
                <div>
                  <h4 className="font-bold">Arjun Sharma</h4>
                  <p className="text-sm text-gray-400">IIT Bombay • 3rd Year</p>
                </div>
              </div>
            </div>
            
            <div className="testimonial-card animate-reveal delay-200">
              <p className="testimonial-text text-gray-600">"Selling my old cooler was so easy. I listed it during my lunch break and found a buyer by evening. The chat system is way better than chaotic WhatsApp groups."</p>
              <div className="testimonial-author">
                <div className="testimonial-avatar">RK</div>
                <div>
                  <h4 className="font-bold">Riya Kapoor</h4>
                  <p className="text-sm text-gray-400">VJTI Mumbai • Graduate</p>
                </div>
              </div>
            </div>
            
            <div className="testimonial-card animate-reveal delay-300">
              <p className="testimonial-text text-gray-600">"As a freshman, QuadSwap was a lifesaver for finding a cheap study table and chair. The verified student check gives me so much peace of mind."</p>
              <div className="testimonial-author">
                <div className="testimonial-avatar">SM</div>
                <div>
                  <h4 className="font-bold">Sahil Mehta</h4>
                  <p className="text-sm text-gray-400">DMCE Campus • 1st Year</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Deep Features Overview */}
      <section id="features" className="features-section">
        <div className="container">
          <div className="flex flex-col md:flex-row justify-between items-end mb-16">
            <div>
              <h2 className="section-title text-left mb-2">More Than a Marketplace</h2>
              <p className="text-gray-500 max-w-lg">Designed to solve specific college ecosystem problems.</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12">
            <div className="feature-rich-card">
              <div className="feature-icon-wrapper">
                <SearchCheck size={36} />
              </div>
              <h3>ISO (In Search Of)</h3>
              <p>Don't want to scroll endlessly? Post an ISO request specifying your budget. We'll automatically notify you when another student lists that exact item.</p>
            </div>
            <div className="feature-rich-card">
              <div className="feature-icon-wrapper">
                <ShieldCheck size={36} />
              </div>
              <h3>Community Rated</h3>
              <p>Say goodbye to scammers. QuadSwap utilizes a robust reliability badge system based on real student reviews and successful transaction history.</p>
            </div>
            <div className="feature-rich-card">
              <div className="feature-icon-wrapper">
                <HeartPulse size={36} />
              </div>
              <h3>Giveaway Section</h3>
              <p>Graduating or moving out? Easily list items for free. Help out juniors or those in need instead of throwing perfectly good essentials away.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="container">
        <div className="cta-banner">
          <h2 className="cta-title">Ready to declutter or score a deal?</h2>
          <p className="cta-subtitle">
            Join thousands of students on your campus today. List your first item in under 60 seconds.
          </p>
          <div className="flex justify-center gap-4">
            <button onClick={() => navigate('/signup')} className="btn btn-primary cta-btn-white" style={{ padding: '1rem 2.5rem', fontSize: '1.1rem' }}>
              Create Free Account
            </button>
          </div>
        </div>
      </section>

      {/* Structured Footer */}
      <footer className="footer">
        <div className="container">
          <div className="footer-top">
            <div className="footer-col">
              <div className="nav-brand footer-brand">
                <ShoppingBag size={28} />
                <span>QuadSwap</span>
              </div>
              <p className="footer-desc">
                The most reliable peer-to-peer campus marketplace. Making buying, selling, and renting seamless for students and PG residents.
              </p>
              <form className="newsletter-form" onSubmit={(e) => e.preventDefault()}>
                <input type="email" placeholder="Subscribe for campus updates" className="newsletter-input" />
                <button type="submit" className="btn btn-primary" style={{ padding: '0.75rem' }}>
                  <Send size={18} />
                </button>
              </form>
            </div>
            
            <div className="footer-col">
              <h4 className="footer-title">Platform</h4>
              <ul className="footer-links">
                <li><button onClick={() => navigate('/login')} style={{ background: 'none', border: 'none', padding: 0, color: 'inherit', cursor: 'pointer', font: 'inherit' }}>Browse Items</button></li>
                <li><button onClick={() => navigate('/login')} style={{ background: 'none', border: 'none', padding: 0, color: 'inherit', cursor: 'pointer', font: 'inherit' }}>Post an Ad</button></li>
                <li><button onClick={() => navigate('/login')} style={{ background: 'none', border: 'none', padding: 0, color: 'inherit', cursor: 'pointer', font: 'inherit' }}>ISO Board</button></li>
                <li><button onClick={() => navigate('/login')} style={{ background: 'none', border: 'none', padding: 0, color: 'inherit', cursor: 'pointer', font: 'inherit' }}>Giveaways</button></li>
                <li><button onClick={() => navigate('/login')} style={{ background: 'none', border: 'none', padding: 0, color: 'inherit', cursor: 'pointer', font: 'inherit' }}>Safety Center</button></li>
              </ul>
            </div>
            
            <div className="footer-col">
              <h4 className="footer-title">Company</h4>
              <ul className="footer-links">
                <li><button onClick={() => navigate('/info/about-us')} className="footer-link-btn">About Us</button></li>
                <li><button onClick={() => navigate('/info/careers')} className="footer-link-btn">Careers</button></li>
                <li><button onClick={() => navigate('/info/ambassadors')} className="footer-link-btn">Campus Ambassadors</button></li>
                <li><button onClick={() => navigate('/info/support')} className="footer-link-btn">Contact Support</button></li>
              </ul>
            </div>
            
            <div className="footer-col">
              <h4 className="footer-title">Legal</h4>
              <ul className="footer-links">
                <li><button onClick={() => navigate('/info/terms')} className="footer-link-btn">Terms of Service</button></li>
                <li><button onClick={() => navigate('/info/privacy')} className="footer-link-btn">Privacy Policy</button></li>
                <li><button onClick={() => navigate('/info/cookies')} className="footer-link-btn">Cookie Policy</button></li>
                <li><button onClick={() => navigate('/info/verification')} className="footer-link-btn">Student Verification Rules</button></li>
              </ul>
            </div>
          </div>
          
          <div className="footer-bottom">
            <p className="text-gray-500 text-sm">
              &copy; {new Date().getFullYear()} QuadSwap Technologies Inc. All rights reserved.
            </p>
            <div className="social-icons">
              <a href="#" className="social-icon" aria-label="Twitter">
                <Twitter size={20} />
              </a>
              <a href="#" className="social-icon" aria-label="Instagram">
                <Instagram size={20} />
              </a>
              <a href="#" className="social-icon" aria-label="LinkedIn">
                <Linkedin size={20} />
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
