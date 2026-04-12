import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Navigation, Upload, User, ShieldCheck, Mail, Lock, Phone, BookOpen, Building2 } from 'lucide-react';
import axios from 'axios';
import { supabase } from '../lib/supabaseClient';
import '../index.css';

function Signup() {
  const navigate = useNavigate();
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [loadingSubmit, setLoadingSubmit] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');

  useState(() => {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    setTheme(savedTheme);
  }, []);
  const [formData, setFormData] = useState({
    profilePic: null,
    fullName: '',
    yearOfStudy: '',
    studentIdNum: '',
    whatsapp: '',
    college: '',
    area: '',
    city: '',
    pincode: '',
    idUpload: null,
    email: '',
    password: '',
    confirmPassword: '',
    latitude: null,
    longitude: null,
    fullAddress: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Auto-fetch pincode details when 6 digits are entered
    if (name === 'pincode' && value.length === 6) {
      fetchPincodeDetails(value);
    }
  };

  const handleFileChange = (e) => {
    const { name, files } = e.target;
    setFormData(prev => ({ ...prev, [name]: files[0] }));
  };

  const fetchPincodeDetails = async (pin) => {
    try {
      const res = await axios.get(`https://api.postalpincode.in/pincode/${pin}`);
      if (res.data[0].Status === 'Success') {
        const postOffice = res.data[0].PostOffice[0];
        setFormData(prev => ({
          ...prev,
          area: postOffice.Name,
          city: postOffice.District
        }));
      }
    } catch (error) {
      console.error('Error fetching pincode data', error);
    }
  };

  const detectLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }
    setLoadingLocation(true);
    navigator.geolocation.getCurrentPosition(async (position) => {
      try {
        const { latitude, longitude } = position.coords;
        // Using OpenStreetMap Nominatim for highly granular area details (neighbourhood/suburb)
        const res = await axios.get(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`);
        
        const address = res.data.address || {};
        
        const exactCity = address.city || address.town || address.county || address.state_district || '';
        const exactState = address.state || '';
        const exactCountry = address.country || '';
        const exactPostcode = address.postcode || '';

        // The display_name contains maximum granularity (Building, Street, Landmark)
        // We will take the full detailed string, and optionally strip out the State/Country since they are redundant
        const parts = (res.data.display_name || '').split(',').map(p => p.trim());
        const detailedAreaParts = parts.filter(part => 
          part !== exactState && 
          part !== exactCountry &&
          part !== exactPostcode
        );

        setFormData(prev => ({
          ...prev,
          area: detailedAreaParts.join(', '),
          city: exactCity,
          pincode: exactPostcode,
          latitude,
          longitude,
          fullAddress: res.data.display_name
        }));
      } catch (error) {
        console.error('Error detecting location', error);
        alert('Could not detect specific area. Please manually enter.');
      } finally {
        setLoadingLocation(false);
      }
    }, () => {
      alert("Unable to retrieve your location. Please check browser permissions.");
      setLoadingLocation(false);
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    if (formData.password !== formData.confirmPassword) {
      setErrorMsg("Passwords don't match!");
      return;
    }

    // Mock check if keys exist
    if(supabase.supabaseUrl === 'https://placeholder.supabase.co') {
        alert("Supabase keys are missing in client/.env! Mocking success and redirecting to dashboard.");
        navigate('/dashboard');
        return;
    }

    try {
      setLoadingSubmit(true);

      // 1. Create Auth User
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password
      });

      if (authError) throw authError;

      const userId = authData.user?.id;
      let uploadedPicUrl = null;
      let uploadedIdUrl = null;

      // 1.5 Upload Profile Picture (if exists)
      if (formData.profilePic) {
        const fileExt = formData.profilePic.name.split('.').pop();
        const filePath = `${userId}-${Math.random()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, formData.profilePic);
        
        if (uploadError) throw new Error("Profile Picture Error: " + uploadError.message);
        const { data: picData } = supabase.storage.from('avatars').getPublicUrl(filePath);
        uploadedPicUrl = picData.publicUrl;
      }

      // 1.6 Upload ID Document
      if (formData.idUpload) {
        const fileExt = formData.idUpload.name.split('.').pop();
        const filePath = `${userId}-${Math.random()}.${fileExt}`;
        const { error: idUploadError } = await supabase.storage.from('documents').upload(filePath, formData.idUpload);
        
        if (idUploadError) throw new Error("ID Upload Error: " + idUploadError.message);
        const { data: idData } = supabase.storage.from('documents').getPublicUrl(filePath);
        uploadedIdUrl = idData.publicUrl;
      }

      // 2. Insert into QuadSwap users table
      const { error: dbError } = await supabase.from('users').insert([
        {
          id: userId,
          full_name: formData.fullName,
          email: formData.email,
          password_hash: 'managed_by_supabase_auth',
          whatsapp_number: formData.whatsapp,
          year_of_study: formData.yearOfStudy,
          student_id_num: formData.studentIdNum,
          college: formData.college,
          pincode: formData.pincode,
          city: formData.city,
          area: formData.area,
          latitude: formData.latitude,
          longitude: formData.longitude,
          profile_pic_url: uploadedPicUrl,
          id_upload_url: uploadedIdUrl
        }
      ]);

      if (dbError) throw dbError;

      console.log("Registered into DB perfectly:", formData);
      navigate('/dashboard');
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to register account');
    } finally {
      setLoadingSubmit(false);
    }
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-color)', padding: '3rem 1rem', transition: 'background-color 0.3s' }}>
      <div className="container" style={{ maxWidth: '800px' }}>
        <div style={{ background: 'var(--card-bg)', borderRadius: 'var(--radius-xl)', padding: '3rem', boxShadow: 'var(--shadow-xl)', border: '1px solid var(--border-color)' }}>
          <div className="text-center mb-10">
            <h1 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '0.5rem', fontFamily: 'Outfit, sans-serif' }}>Join QuadSwap</h1>
            <p style={{ color: 'var(--text-secondary)' }}>Verify your student identity to access the secure campus marketplace.</p>
          </div>

          {errorMsg && (
            <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #FCA5A5', color: '#B91C1C', padding: '1rem', borderRadius: 'var(--radius-md)', marginBottom: '2rem', fontWeight: 600 }}>
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex-col gap-6" style={{ display: 'flex' }}>
            {/* Profile Picture */}
            <div className="flex-col" style={{ alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{ width: '100px', height: '100px', borderRadius: '50%', background: 'var(--bg-color)', border: '2px dashed var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem', overflow: 'hidden' }}>
                {formData.profilePic ? (
                  <img src={URL.createObjectURL(formData.profilePic)} alt="Profile Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <User size={32} color="var(--text-tertiary)" />
                )}
              </div>
              <label className="btn btn-outline" style={{ cursor: 'pointer', padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
                <Upload size={16} /> {formData.profilePic ? 'Change Picture' : 'Upload Profile Pic'}
                <input type="file" name="profilePic" style={{ display: 'none' }} onChange={handleFileChange} accept="image/*" />
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Basic Details */}
              <div className="input-group">
                <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem' }}>Full Name <span style={{color:'red'}}>*</span></label>
                <div style={{ position: 'relative' }}>
                  <User size={18} style={{ position: 'absolute', top: '12px', left: '12px', color: 'var(--text-tertiary)' }} />
                  <input required name="fullName" value={formData.fullName} onChange={handleChange} type="text" placeholder="John Doe" style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--sidebar-bg)', color: 'var(--text-primary)' }} />
                </div>
              </div>

              <div className="input-group">
                <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem' }}>Year of Study / Job Title <span style={{color:'red'}}>*</span></label>
                <div style={{ position: 'relative' }}>
                  <BookOpen size={18} style={{ position: 'absolute', top: '12px', left: '12px', color: 'var(--text-tertiary)' }} />
                  <input required name="yearOfStudy" value={formData.yearOfStudy} onChange={handleChange} type="text" placeholder="e.g. 2nd Year B.Tech" style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--sidebar-bg)', color: 'var(--text-primary)' }} />
                </div>
              </div>

              <div className="input-group">
                <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem' }}>Student ID / Aadhar Num <span style={{color:'red'}}>*</span></label>
                <div style={{ position: 'relative' }}>
                  <ShieldCheck size={18} style={{ position: 'absolute', top: '12px', left: '12px', color: 'var(--text-tertiary)' }} />
                  <input required name="studentIdNum" value={formData.studentIdNum} onChange={handleChange} type="text" placeholder="ID Number" style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--sidebar-bg)', color: 'var(--text-primary)' }} />
                </div>
              </div>

              <div className="input-group">
                <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem' }}>WhatsApp Number <span style={{color:'red'}}>*</span></label>
                <div style={{ position: 'relative' }}>
                  <Phone size={18} style={{ position: 'absolute', top: '12px', left: '12px', color: 'var(--text-tertiary)' }} />
                  <input required name="whatsapp" value={formData.whatsapp} onChange={handleChange} type="tel" placeholder="+91 90000 00000" style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--sidebar-bg)', color: 'var(--text-primary)' }} />
                </div>
              </div>

              <div className="col-span-1 md:col-span-2 input-group" style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem' }}>College / Institute / Organization <span style={{color:'red'}}>*</span></label>
                <div style={{ position: 'relative' }}>
                  <Building2 size={18} style={{ position: 'absolute', top: '12px', left: '12px', color: 'var(--text-tertiary)' }} />
                  <input required name="college" value={formData.college} onChange={handleChange} type="text" placeholder="e.g. DMCE" style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--sidebar-bg)', color: 'var(--text-primary)' }} />
                </div>
              </div>
              
              <div className="col-span-1 md:col-span-2">
                <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '1rem 0' }} />
                <h4 style={{ fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <MapPin size={20} color="var(--primary)" /> Location Details
                </h4>
              </div>

              <div className="input-group">
                <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem' }}>Pincode <span style={{color:'red'}}>*</span></label>
                <input required name="pincode" value={formData.pincode} onChange={handleChange} type="text" maxLength={6} placeholder="e.g. 400708" style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--sidebar-bg)', color: 'var(--text-primary)' }} />
              </div>

              <div className="input-group">
                <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem' }}>City <span style={{color:'red'}}>*</span></label>
                <input required name="city" value={formData.city} onChange={handleChange} type="text" placeholder="Navi Mumbai" style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--sidebar-bg)', color: 'var(--text-primary)' }} />
              </div>

              <div className="input-group">
                <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem' }}>Latitude</label>
                <input name="latitude" value={formData.latitude || ''} onChange={handleChange} type="text" placeholder="e.g. 19.0760" style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--sidebar-bg)', color: 'var(--text-primary)' }} />
              </div>

              <div className="input-group">
                <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem' }}>Longitude</label>
                <input name="longitude" value={formData.longitude || ''} onChange={handleChange} type="text" placeholder="e.g. 72.8777" style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--sidebar-bg)', color: 'var(--text-primary)' }} />
              </div>

              <div className="col-span-1 md:col-span-2 input-group" style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem' }}>Area / PG / Address <span style={{color:'red'}}>*</span></label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input required name="area" value={formData.area} onChange={handleChange} type="text" placeholder="Start typing specific area..." style={{ flex: 1, padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--sidebar-bg)', color: 'var(--text-primary)' }} />
                  <button type="button" onClick={detectLocation} className="btn btn-outline" style={{ padding: '0.75rem', gap: '0.5rem' }}>
                    <Navigation size={18} /> {loadingLocation ? 'Detecting...' : 'Detect'}
                  </button>
                </div>
              </div>

              <div className="col-span-1 md:col-span-2">
                <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '1rem 0' }} />
                <h4 style={{ fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <ShieldCheck size={20} color="var(--primary)" /> Verification & Account
                </h4>
              </div>

              <div className="col-span-1 md:col-span-2 input-group" style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', background: 'var(--bg-color)', padding: '1.5rem', borderRadius: 'var(--radius-md)', border: '1px dashed var(--primary)', cursor: 'pointer', textAlign: 'center' }}>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Upload ID / Aadhar Card <span style={{color:'red'}}>*</span></span>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Used strictly for student verification. PDF or JPG.</span>
                  <input required type="file" name="idUpload" style={{ display: 'none' }} onChange={handleFileChange} />
                  {formData.idUpload && <span style={{ color: 'var(--success)', fontWeight: 600 }}>File selected: {formData.idUpload.name}</span>}
                </label>
              </div>

              <div className="input-group" style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem' }}>Email Address <span style={{color:'red'}}>*</span></label>
                <div style={{ position: 'relative' }}>
                  <Mail size={18} style={{ position: 'absolute', top: '12px', left: '12px', color: 'var(--text-tertiary)' }} />
                  <input required name="email" value={formData.email} onChange={handleChange} type="email" placeholder="student@college.edu" style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--sidebar-bg)', color: 'var(--text-primary)' }} />
                </div>
              </div>

              <div className="input-group">
                <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem' }}>Password <span style={{color:'red'}}>*</span></label>
                <div style={{ position: 'relative' }}>
                  <Lock size={18} style={{ position: 'absolute', top: '12px', left: '12px', color: 'var(--text-tertiary)' }} />
                  <input required name="password" value={formData.password} onChange={handleChange} type="password" placeholder="••••••••" style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--sidebar-bg)', color: 'var(--text-primary)' }} />
                </div>
              </div>
              
              <div className="input-group">
                <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem' }}>Confirm Password <span style={{color:'red'}}>*</span></label>
                <div style={{ position: 'relative' }}>
                  <Lock size={18} style={{ position: 'absolute', top: '12px', left: '12px', color: 'var(--text-tertiary)' }} />
                  <input required name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} type="password" placeholder="••••••••" style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--sidebar-bg)', color: 'var(--text-primary)' }} />
                </div>
              </div>
            </div>

            <button type="submit" disabled={loadingSubmit} className="btn btn-primary" style={{ width: '100%', marginTop: '1rem', padding: '1rem', fontSize: '1.1rem' }}>
              {loadingSubmit ? 'Creating Database Entry...' : 'Complete Registration'}
            </button>
            <p className="text-center" style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              Already have an account? <span style={{ color: 'var(--primary)', fontWeight: 600, cursor: 'pointer' }} onClick={() => navigate('/login')}>Log in</span>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Signup;
