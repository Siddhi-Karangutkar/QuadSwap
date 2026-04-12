import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, ShieldCheck, HelpCircle, Briefcase, Users, FileText, Lock, Cookie, Verified, ShoppingBag } from 'lucide-react';

const contentMap = {
  'about-us': {
    title: 'About QuadSwap',
    category: 'Company',
    icon: <ShoppingBag size={32} className="text-primary mb-6" />,
    description: 'The most reliable peer-to-peer campus marketplace.',
    sections: [
      {
        heading: 'Our Mission',
        text: 'QuadSwap was born out of a simple problem: campus WhatsApp groups are chaotic, unreliable, and often unsafe. We built a platform that belongs to the students—a place where you can trade semester books, dorm essentials, and more with verified peers in your own building or department.'
      },
      {
        heading: 'Why QuadSwap?',
        text: 'Unlike general marketplaces, we focus exclusively on the campus ecosystem. We prioritize security via student identification, proximity via campus-specific filtering, and trust via a transparent community rating system.'
      }
    ]
  },
  'careers': {
    title: 'Join the Team',
    category: 'Company',
    icon: <Briefcase size={32} className="text-secondary mb-6" />,
    description: 'Help us build the future of campus commerce.',
    sections: [
      {
        heading: 'Remote-First Culture',
        text: 'We are a small but passionate team of engineers and designers working to revolutionize how students interact. We value autonomy, creativity, and a deep understanding of student life.'
      },
      {
        heading: 'Open Roles',
        text: 'We are currently looking for Student Developers and UI/UX Interns for our Summer 2026 cohort. If you love building community-focused tech, reach out to us.'
      }
    ]
  },
  'ambassadors': {
    title: 'Campus Ambassadors',
    category: 'Company',
    icon: <Users size={32} className="text-accent mb-6" />,
    description: 'Lead the QuadSwap revolution on your campus.',
    sections: [
      {
        heading: 'The Program',
        text: 'Our Ambassadors are the heartbeat of QuadSwap. You’ll be responsible for growing the community on your campus, organizing giveaway events, and providing direct feedback to our product team.'
      },
      {
        heading: 'Perks',
        text: 'Get exclusive QuadSwap swag, early access to new features, and a prestigious certificate of leadership for your resume. Plus, earn points for every verified student you bring onto the platform.'
      }
    ]
  },
  'support': {
    title: 'Contact Support',
    category: 'Company',
    icon: <HelpCircle size={32} className="text-indigo-500 mb-6" />,
    description: 'We’re here to help you swap safely.',
    sections: [
      {
        heading: '24/7 Assistance',
        text: 'Having trouble with a transaction or a payment verification? Our student support team is available around the clock to mediate disputes and resolve technical issues.'
      },
      {
        heading: 'How to Reach Us',
        text: 'You can email us at support@quadswap.edu or use the Help Center within your dashboard for instant live chat with a moderator.'
      }
    ]
  },
  'terms': {
    title: 'Terms of Service',
    category: 'Legal',
    icon: <FileText size={32} className="text-gray-400 mb-6" />,
    description: 'The rules of the swap.',
    sections: [
      {
        heading: 'User Conduct',
        text: 'By using QuadSwap, you agree to interact honestly and respectfully with other students. Harassment, fraud, or listing prohibited items will lead to an immediate and permanent ban.'
      },
      {
        heading: 'Transactions',
        text: 'QuadSwap provides the platform for discovery and communication. While we facilitate payment verification, the final exchange of items is a private contract between the buyer and seller.'
      }
    ]
  },
  'privacy': {
    title: 'Privacy Policy',
    category: 'Legal',
    icon: <Lock size={32} className="text-green-500 mb-6" />,
    description: 'Your data, protected.',
    sections: [
      {
        heading: 'Information We Collect',
        text: 'We only collect what is necessary to verify your student status and facilitate swaps. This includes your campus email, name, and listing details. We never sell your data to third parties.'
      },
      {
        heading: 'Security',
        text: 'Your sensitive information is encrypted and stored securely using Supabase. We utilize modern authentication protocols to ensure your account remains in your hands.'
      }
    ]
  },
  'cookies': {
    title: 'Cookie Policy',
    category: 'Legal',
    icon: <Cookie size={32} className="text-amber-600 mb-6" />,
    description: 'How we use cookies.',
    sections: [
      {
        heading: 'Essential Cookies',
        text: 'We use cookies strictly to keep you logged in and remember your theme preferences (Light/Dark mode). No tracking cookies are used for advertising.'
      }
    ]
  },
  'verification': {
    title: 'Student Verification',
    category: 'Legal',
    icon: <Verified size={32} className="text-primary mb-6" />,
    description: 'Keeping our community safe.',
    sections: [
      {
        heading: 'Why Verify?',
        text: 'Every user on QuadSwap must be a verified student. This ensures that when you meet someone for a swap, you’re meeting a peer from your own campus, not a complete stranger.'
      },
      {
        heading: 'The Process',
        text: 'Upload a clear photo of your student ID or use your EDU email address to unlock full trading capabilities. Once verified, you’ll receive the "Verified Student" badge on your profile.'
      }
    ]
  }
};

const InfoPage = () => {
  const { type } = useParams();
  const navigate = useNavigate();
  const content = contentMap[type] || contentMap['about-us'];

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [type]);

  return (
    <div className={`info-page-wrapper ${content.category.toLowerCase()}-theme`}>
      <nav className="navbar scrolled">
        <div className="container flex justify-between items-center">
          <button 
            onClick={() => navigate('/')} 
            className="back-btn-premium"
          >
            <ChevronLeft size={20} />
            <span>Back to Home</span>
          </button>
          <div className="nav-brand">
            <ShoppingBag size={28} />
            <span>QuadSwap</span>
          </div>
          <div className="w-[120px] hidden md:block"></div>
        </div>
      </nav>

      <div className="info-hero">
        <div className="info-hero-glow"></div>
        <div className="container relative z-10 animate-reveal">
          <div className="flex justify-center mb-6">
            <div className="info-category-badge">
              {content.category}
            </div>
          </div>
          
          <div className="info-hero-header">
            <div className="info-main-icon-sm">{content.icon}</div>
            <h1 className="info-page-title">{content.title}</h1>
          </div>
          
          <p className="info-page-subtitle">{content.description}</p>
        </div>
      </div>

      <main className="container pb-24">
        <div className="info-content-grid animate-slide-up">
          {content.sections.map((section, idx) => (
            <div key={idx} className="info-section-card">
              <div className="info-section-number">0{idx + 1}</div>
              <h2 className="info-section-heading">{section.heading}</h2>
              <p className="info-section-text">
                {section.text}
              </p>
            </div>
          ))}
        </div>

        <div className="info-cta text-center mt-20 animate-reveal">
          <div className="cta-glass-box">
            <h3 className="text-2xl font-bold mb-4">Still have questions?</h3>
            <p className="text-secondary mb-8">Our campus moderators are here to help you 24/7.</p>
            <div className="flex justify-center gap-4">
              <button onClick={() => navigate('/login')} className="btn btn-primary px-8 py-4">
                Get Started
              </button>
              <button onClick={() => navigate('/info/support')} className="btn btn-outline px-8 py-4">
                Support Center
              </button>
            </div>
          </div>
        </div>
      </main>

      <footer className="footer py-12">
        <div className="container text-center">
          <p className="text-secondary">&copy; {new Date().getFullYear()} QuadSwap Technologies Inc. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default InfoPage;
