import React, { useState, useEffect } from 'react';
import { Tag, ShieldAlert, Upload, Image as ImageIcon, MapPin, Clock, Phone, X } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';

export default function SellRentForm({ editingItem, onClearEdit, userData }) {
  const [mode, setMode] = useState('sell'); // 'sell' or 'rent'
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // --- NEW STATIC / COMMON FIELDS ---
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Electronics');
  const [description, setDescription] = useState('');
  const [condition, setCondition] = useState('Good');
  
  // Media
  const [photos, setPhotos] = useState([]);
  const [billPhoto, setBillPhoto] = useState(null);

  // Logistics & Preferences
  const [pickupLoc, setPickupLoc] = useState('Green View PG, Sector 2'); // Mock default from profile
  const [availabilityDate, setAvailabilityDate] = useState('Available Immediately');
  const [meetupSpot, setMeetupSpot] = useState('College Gate No. 2');
  const [showPhone, setShowPhone] = useState(true);
  const [contactTime, setContactTime] = useState('After 6 PM');

  // Sell Specific
  const [sellPrice, setSellPrice] = useState('');
  const [priceType, setPriceType] = useState('Fixed');
  const [usageDuration, setUsageDuration] = useState('1 Semester');
  const [sellReason, setSellReason] = useState('No longer needed📦');
  const [originalPrice, setOriginalPrice] = useState('');
  const [isCombo, setIsCombo] = useState(false);
  const [comboDescription, setComboDescription] = useState('');

  // Rent Specific
  const [rentAmount, setRentAmount] = useState('');
  const [rentCycle, setRentCycle] = useState('Month');
  const [securityDeposit, setSecurityDeposit] = useState('');
  const [minPeriod, setMinPeriod] = useState('1 Month');
  const [maxPeriod, setMaxPeriod] = useState('Full Semester');
  const [maintenance, setMaintenance] = useState('');
  const [damagePolicy, setDamagePolicy] = useState('Deduct from Deposit');
  const [returnPolicy, setReturnPolicy] = useState('');
  const [rentReason, setRentReason] = useState('Extra one I am not using');

  const conditionsList = ['Brand New', 'Like New', 'Good', 'Fair/Functional'];
  const sellReasonsList = [
    'Moving Out/Graduating🎓', 
    'Upgrading✨', 
    'No longer needed📦', 
    'Needs Repair🛠️', 
    'Need Cash💸', 
    'Moving to a Furnished PG🏢'
  ];
  const rentReasonsList = [
    'Going home for the summer',
    'Extra one I am not using',
    'Item is expensive, easier to rent out'
  ];

  useEffect(() => {
    if (editingItem) {
      setMode(editingItem.type);
      setTitle(editingItem.title);
      setCategory(editingItem.category);
      setDescription(editingItem.description);
      setCondition(editingItem.condition);
      setPickupLoc(editingItem.pickup_location);
      setAvailabilityDate(editingItem.availability_date);
      setMeetupSpot(editingItem.preferred_meetup_spot);
      setShowPhone(editingItem.show_phone);
      setContactTime(editingItem.preferred_contact_time);
      
      if (editingItem.type === 'sell') {
        setSellPrice(editingItem.sell_price.toString());
        setPriceType(editingItem.price_type);
        setUsageDuration(editingItem.usage_duration);
        setSellReason(editingItem.sell_reason);
        setOriginalPrice(editingItem.original_price ? editingItem.original_price.toString() : '');
        setIsCombo(editingItem.is_combo);
        setComboDescription(editingItem.combo_description || '');
      } else {
        setRentAmount(editingItem.rent_amount.toString());
        setRentCycle(editingItem.rent_cycle);
        setSecurityDeposit(editingItem.security_deposit.toString());
        setMinPeriod(editingItem.min_period);
        setMaxPeriod(editingItem.max_period);
        setRentReason(editingItem.rent_reason);
        setMaintenance(editingItem.maintenance_terms || '');
        setDamagePolicy(editingItem.damage_policy || '');
        setReturnPolicy(editingItem.return_policy || '');
      }
    }
  }, [editingItem]);

  const handlePhotoUpload = (e) => {
    if (e.target.files.length + photos.length > 5) {
      alert("You can only upload up to 5 photos!");
      return;
    }
    setPhotos([...photos, ...Array.from(e.target.files)]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Get Logged in User safely
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw new Error("You must be logged in to post an item!");

      // 2. Upload Item Photos to 'item_images' bucket dynamically
      const uploadedPhotos = [];
      for (let i = 0; i < photos.length; i++) {
        const file = photos[i];
        const fileExt = file.name.split('.').pop();
        const filePath = `${user.id}/${Date.now()}-photo${i}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage.from('item_images').upload(filePath, file);
        if (uploadError) throw new Error("Failed to upload photo: " + uploadError.message);
        
        const { data: { publicUrl } } = supabase.storage.from('item_images').getPublicUrl(filePath);
        uploadedPhotos.push(publicUrl);
      }

      // 3. Upload proof/bill photo (ONLY IF NEW ONE ADDED)
      let uploadedBill = editingItem ? editingItem.bill_photo : null;
      if (billPhoto) {
        const fileExt = billPhoto.name.split('.').pop();
        const filePath = `${user.id}/${Date.now()}-bill.${fileExt}`;
        const { error: billError } = await supabase.storage.from('item_images').upload(filePath, billPhoto);
        if (billError) throw new Error("Bill upload failed: " + billError.message);
        
        const { data: { publicUrl } } = supabase.storage.from('item_images').getPublicUrl(filePath);
        uploadedBill = publicUrl;
      }

      // construct mapped Payload
      const payload = {
        seller_id: user.id,
        type: mode,
        title,
        category,
        description,
        condition,
        photos: photos.length > 0 ? uploadedPhotos : (editingItem ? editingItem.photos : []),
        bill_photo: uploadedBill,
        pickup_location: pickupLoc,
        availability_date: availabilityDate,
        preferred_meetup_spot: meetupSpot,
        show_phone: showPhone,
        preferred_contact_time: contactTime,
      };

      if (mode === 'sell') {
        payload.sell_price = parseFloat(sellPrice);
        payload.price_type = priceType;
        payload.usage_duration = usageDuration;
        payload.sell_reason = sellReason;
        payload.original_price = originalPrice ? parseFloat(originalPrice) : null;
        payload.is_combo = isCombo;
        payload.combo_description = isCombo ? comboDescription : null;
      } else {
        payload.rent_amount = parseFloat(rentAmount);
        payload.rent_cycle = rentCycle;
        payload.security_deposit = parseFloat(securityDeposit);
        payload.min_period = minPeriod;
        payload.max_period = maxPeriod;
        payload.rent_reason = rentReason;
        payload.maintenance_terms = maintenance;
        payload.damage_policy = damagePolicy;
        payload.return_policy = returnPolicy;
      }

      if (editingItem) {
        const { error: dbError } = await supabase.from('items').update(payload).eq('id', editingItem.id);
        if (dbError) throw dbError;
        alert("Listing updated successfully! ✈️");
        onClearEdit();
      } else {
        const { error: dbError } = await supabase.from('items').insert([payload]);
        if (dbError) throw dbError;
        setSuccess(true);
        setTimeout(() => setSuccess(false), 5000);
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 5000);
      
    } catch (err) {
      alert("Error posting item: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (userData && !userData.is_verified) {
    return (
      <div style={{ maxWidth: '600px', margin: '4rem auto', textAlign: 'center', padding: '3rem', background: 'var(--card-bg)', borderRadius: '24px', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-premium)' }}>
        <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(148,163,184,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
          <ShieldAlert size={40} color="#94A3B8" />
        </div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.75rem' }}>Account Verification Required</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.6, maxWidth: '400px', margin: '0 auto 1.5rem' }}>
          Your account is pending admin verification. You can browse items on the marketplace, but posting items is restricted until your identity is verified.
        </p>
        <div style={{ padding: '0.75rem 1.5rem', background: 'rgba(148,163,184,0.08)', borderRadius: '12px', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: '#94A3B8', fontWeight: 700, fontSize: '0.85rem' }}>
          <Clock size={16} /> Verification in progress...
        </div>
      </div>
    );
  }

  return (
    <div className="glass-morphism animate-card-entrance" style={{ maxWidth: '850px', margin: '0 auto', background: 'var(--card-bg)', padding: '2.5rem', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-premium)' }}>
      <h2 style={{ fontSize: '2.2rem', fontWeight: 800, marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--text-primary)' }}>
        <Tag size={32} /> {editingItem ? 'Edit Your Listing 📝' : 'Post an Item'}
      </h2>

      {editingItem && (
        <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'rgba(79, 70, 229, 0.1)', borderRadius: '12px', border: '1px solid var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }} className="animate-reveal">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ padding: '0.5rem', background: 'var(--primary)', color: 'white', borderRadius: '8px' }}><Clock size={18} /></div>
            <div>
              <p style={{ margin: 0, fontWeight: 700, fontSize: '0.95rem' }}>Editing Mode Active</p>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Updating: {editingItem.title}</p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClearEdit}
            style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#EF4444' }}
          >
            <X size={14} /> Cancel Edit
          </button>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', background: 'var(--sidebar-bg)', padding: '0.5rem', borderRadius: '16px' }}>
        <button 
          type="button"
          onClick={() => setMode('sell')}
          style={{ flex: 1, padding: '1rem', borderRadius: '12px', fontWeight: 700, border: 'none', cursor: 'pointer', background: mode === 'sell' ? 'var(--primary)' : 'transparent', color: mode === 'sell' ? 'white' : 'var(--text-secondary)', boxShadow: mode === 'sell' ? 'var(--shadow-md)' : 'none', transition: 'all var(--transition-smooth)' }}
        >
          Sell
        </button>
        <button 
          type="button"
          onClick={() => setMode('rent')}
          style={{ flex: 1, padding: '1rem', borderRadius: '12px', fontWeight: 700, border: 'none', cursor: 'pointer', background: mode === 'rent' ? 'var(--primary)' : 'transparent', color: mode === 'rent' ? 'white' : 'var(--text-secondary)', boxShadow: mode === 'rent' ? 'var(--shadow-md)' : 'none', transition: 'all var(--transition-smooth)' }}
        >
          Rent Out
        </button>
      </div>

      {success && (
        <div style={{ padding: '1rem', background: 'rgba(52, 211, 153, 0.1)', color: 'var(--success)', border: '1px solid var(--success)', borderRadius: '8px', marginBottom: '1.5rem', fontWeight: 600 }}>
          Item posted successfully! It is now live on the campus board.
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex-col gap-5" style={{ display: 'flex' }}>
        
        {/* === CORE / STATIC DETAILS === */}
        <div style={{ background: 'var(--sidebar-bg)', padding: '2rem', borderRadius: '20px', border: '1px solid var(--border-color)', marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: '1.5rem', color: 'var(--text-primary)' }}>General Details</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="input-group">
              <label style={{ fontWeight: 700, marginBottom: '0.6rem', display: 'block', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Item Title *</label>
              <input required value={title} onChange={e=>setTitle(e.target.value)} type="text" placeholder='e.g., "Bajaj Desert Cooler - 2 years old"' style={{ width: '100%', padding: '0.9rem 1.1rem', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'var(--card-bg)', color: 'var(--text-primary)' }} />
            </div>
            
            <div className="input-group">
              <label style={{ fontWeight: 700, marginBottom: '0.6rem', display: 'block', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Category *</label>
              <select required value={category} onChange={e=>setCategory(e.target.value)} style={{ width: '100%', padding: '0.9rem 1.1rem', borderRadius: '12px', border: '1px solid var(--border-color)', backgroundColor: 'var(--card-bg)', color: 'var(--text-primary)' }}>
                <option>Electronics</option>
                <option>Furniture</option>
                <option>Books/Study Material</option>
                <option>Clothing</option>
                <option>Kitchenware</option>
                <option>Others</option>
              </select>
            </div>

            <div className="input-group" style={{ gridColumn: '1/-1' }}>
              <label style={{ fontWeight: 600, marginBottom: '0.5rem', display: 'block' }}>Item Photos (Up to 5) *</label>
              <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', background: 'var(--card-bg)', border: '2px dashed var(--border-color)', borderRadius: '8px', cursor: 'pointer', color: 'var(--primary)' }}>
                <ImageIcon size={32} style={{ marginBottom: '0.5rem' }} />
                <span style={{ fontWeight: 600 }}>Click to upload images</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Include multiple angles. PNG, JPG.</span>
                <input type="file" multiple accept="image/*" onChange={handlePhotoUpload} style={{ display: 'none' }} />
              </label>
              {photos.length > 0 && (
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                  {photos.map((p, i) => <span key={i} style={{ fontSize: '0.8rem', background: 'var(--sidebar-bg)', padding: '2px 8px', borderRadius: '4px', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>{p.name}</span>)}
                </div>
              )}
            </div>

            <div className="input-group" style={{ gridColumn: '1/-1' }}>
              <label style={{ fontWeight: 600, marginBottom: '0.5rem', display: 'block' }}>Proof of Purchase / Bill (Optional)</label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.8rem 1rem', background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '8px', cursor: 'pointer' }}>
                <Upload size={18} color="var(--primary)" />
                <span style={{ color: billPhoto ? 'var(--text-primary)' : 'var(--text-tertiary)', fontSize: '0.9rem' }}>
                  {billPhoto ? billPhoto.name : 'Upload receipt or box photo (Highly Recommended)'}
                </span>
                <input type="file" accept="image/*,application/pdf" onChange={e => setBillPhoto(e.target.files[0])} style={{ display: 'none' }} />
              </label>
            </div>

            <div className="input-group" style={{ gridColumn: '1/-1' }}>
              <label style={{ fontWeight: 700, marginBottom: '0.6rem', display: 'block', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Description *</label>
              <textarea required value={description} onChange={e=>setDescription(e.target.value)} rows="3" placeholder='e.g., "The fan speed is great but the pump makes a slight noise"' style={{ width: '100%', padding: '0.9rem 1.1rem', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'var(--card-bg)', color: 'var(--text-primary)', resize: 'none' }}></textarea>
            </div>

            <div className="input-group" style={{ gridColumn: '1/-1' }}>
              <label style={{ fontWeight: 600, marginBottom: '0.5rem', display: 'block' }}>Condition *</label>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {conditionsList.map(c => (
                  <button type="button" key={c} onClick={() => setCondition(c)} style={{ padding: '0.5rem 1rem', borderRadius: '20px', fontSize: '0.9rem', border: condition === c ? '2px solid var(--primary)' : '1px solid var(--border-color)', background: condition === c ? 'var(--bg-color)' : 'var(--card-bg)', color: 'var(--text-primary)', cursor: 'pointer', transition: 'all 0.2s' }}>
                    {c}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* LOGISTICS & PREFERENCES */}
        <div style={{ background: 'rgba(0,0,0,0.02)', padding: '2rem', borderRadius: '20px', border: '1px solid var(--border-color)', marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: '1.5rem', color: 'var(--text-primary)' }}>Logistics & Contact</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="input-group">
              <label style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.6rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}><MapPin size={16} /> Pickup Location *</label>
              <input required type="text" value={pickupLoc} onChange={e=>setPickupLoc(e.target.value)} style={{ width: '100%', padding: '0.9rem 1.1rem', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'var(--card-bg)', color: 'var(--text-primary)' }} />
              <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '0.4rem' }}>Auto-filled from your profile. Editable.</p>
            </div>
 
            <div className="input-group">
              <label style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.6rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}><MapPin size={16} /> Preferred Meetup Spot *</label>
              <input required type="text" value={meetupSpot} onChange={e=>setMeetupSpot(e.target.value)} placeholder='e.g., "College Gate No. 2"' style={{ width: '100%', padding: '0.9rem 1.1rem', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'var(--card-bg)', color: 'var(--text-primary)' }} />
            </div>
 
            <div className="input-group">
              <label style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.6rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}><Clock size={16} /> Availability Date *</label>
              <input required type="text" value={availabilityDate} onChange={e=>setAvailabilityDate(e.target.value)} placeholder='e.g., "Available Immediately"' style={{ width: '100%', padding: '0.9rem 1.1rem', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'var(--card-bg)', color: 'var(--text-primary)' }} />
            </div>
 
            <div className="input-group">
              <label style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.6rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}><Clock size={16} /> Preferred Contact Time *</label>
              <input required type="text" value={contactTime} onChange={e=>setContactTime(e.target.value)} placeholder='e.g., "After 6 PM"' style={{ width: '100%', padding: '0.9rem 1.1rem', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'var(--card-bg)', color: 'var(--text-primary)' }} />
            </div>

            <div className="input-group md:col-span-2" style={{ gridColumn: '1/-1', background: 'var(--sidebar-bg)', padding: '1.25rem', borderRadius: '16px', border: '1px dashed var(--border-color)' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontWeight: 700, cursor: 'pointer', color: 'var(--text-primary)' }}>
                <input type="checkbox" checked={showPhone} onChange={e=>setShowPhone(e.target.checked)} style={{ width: '20px', height: '20px' }} />
                <Phone size={20} color={showPhone ? 'var(--primary)' : 'var(--text-tertiary)'} /> Share Phone Number?
              </label>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.6rem', marginLeft: '2.4rem' }}>
                If unchecked, buyers must exclusively use standard in-app chat to reach you.
              </p>
            </div>
          </div>
        </div>

        <hr style={{ margin: '0.5rem 0', borderColor: 'var(--border-color)' }} />

        {/* === MODE SPECIFIC BLOCKS === */}
        {mode === 'sell' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <h3 style={{ gridColumn: '1/-1', fontSize: '1.3rem', fontWeight: 800, color: 'var(--primary)', marginBottom: '0.5rem' }}>Selling Details</h3>
            
            <div className="input-group">
              <label style={{ fontWeight: 600, marginBottom: '0.5rem', display: 'block' }}>Selling Price (₹) *</label>
              <input required type="number" value={sellPrice} onChange={e=>setSellPrice(e.target.value)} placeholder="0" style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--card-bg)', color: 'var(--text-primary)' }} />
            </div>
            <div className="input-group">
              <label style={{ fontWeight: 600, marginBottom: '0.5rem', display: 'block' }}>Price Type *</label>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input type="radio" checked={priceType === 'Fixed'} onChange={() => setPriceType('Fixed')} /> Fixed
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input type="radio" checked={priceType === 'Negotiable'} onChange={() => setPriceType('Negotiable')} /> Negotiable
                </label>
              </div>
            </div>

            <div className="input-group">
              <label style={{ fontWeight: 600, marginBottom: '0.5rem', display: 'block' }}>Reason for Selling *</label>
              <select required value={sellReason} onChange={e=>setSellReason(e.target.value)} style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--card-bg)', color: 'var(--text-primary)' }}>
                {sellReasonsList.map(r => <option key={r}>{r}</option>)}
              </select>
            </div>
            
            <div className="input-group">
              <label style={{ fontWeight: 600, marginBottom: '0.5rem', display: 'block' }}>Usage Duration *</label>
              <input required type="text" value={usageDuration} onChange={e=>setUsageDuration(e.target.value)} placeholder="e.g. 1 Semester" style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--card-bg)', color: 'var(--text-primary)' }} />
            </div>

            <div className="input-group">
              <label style={{ fontWeight: 600, marginBottom: '0.5rem', display: 'block' }}>Original Purchase Price (Optional)</label>
              <input type="number" value={originalPrice} onChange={e=>setOriginalPrice(e.target.value)} placeholder="Helps show discount value" style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--card-bg)', color: 'var(--text-primary)' }} />
            </div>

            <div className="input-group md:col-span-2" style={{ gridColumn: '1/-1', background: 'var(--sidebar-bg)', padding: '1rem', borderRadius: '8px', border: '1px dashed var(--border-color)', transition: 'all 0.3s' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, cursor: 'pointer' }}>
                <input type="checkbox" checked={isCombo} onChange={e=>{
                  setIsCombo(e.target.checked);
                  if(!e.target.checked) setComboDescription('');
                }} style={{ width: '18px', height: '18px' }} />
                Bundle / Combo Deal
              </label>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.5rem', marginLeft: '1.8rem' }}>
                Small add-ons included? (e.g. Cooler + Trolley, Study Table + Lamp). Great way to get rid of minor items!
              </p>
              {isCombo && (
                <div style={{ marginTop: '1rem', marginLeft: '1.8rem' }}>
                  <input required type="text" value={comboDescription} onChange={e=>setComboDescription(e.target.value)} placeholder="e.g. Includes a trolley and a generic extension cord" style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--card-bg)', color: 'var(--text-primary)' }} />
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <h3 style={{ gridColumn: '1/-1', fontSize: '1.2rem', fontWeight: 700, color: 'var(--primary)' }}>Rental Terms</h3>
            <div className="input-group">
              <label style={{ fontWeight: 600, marginBottom: '0.5rem', display: 'block' }}>Rent Amount (₹) *</label>
              <div style={{ display: 'flex' }}>
                <input required type="number" value={rentAmount} onChange={e=>setRentAmount(e.target.value)} placeholder="0" style={{ flex: 1, padding: '0.8rem', borderRadius: '8px 0 0 8px', border: '1px solid var(--border-color)', background: 'var(--card-bg)', color: 'var(--text-primary)' }} />
                <select value={rentCycle} onChange={e=>setRentCycle(e.target.value)} style={{ padding: '0.8rem', borderRadius: '0 8px 8px 0', border: '1px solid var(--border-color)', borderLeft: 'none', background: 'var(--sidebar-bg)', color: 'var(--text-primary)' }}>
                  <option>Day</option>
                  <option>Week</option>
                  <option>Month</option>
                </select>
              </div>
            </div>

            <div className="input-group">
              <label style={{ fontWeight: 600, marginBottom: '0.5rem', display: 'block' }}>Security Deposit (₹) *</label>
              <input required type="number" value={securityDeposit} onChange={e=>setSecurityDeposit(e.target.value)} placeholder="Refundable amount" style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--card-bg)', color: 'var(--text-primary)' }} />
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>Essential. Ensure buyer returns it safely.</p>
            </div>

            <div className="input-group">
              <label style={{ fontWeight: 600, marginBottom: '0.5rem', display: 'block' }}>Min Rental Period *</label>
              <input required type="text" value={minPeriod} onChange={e=>setMinPeriod(e.target.value)} placeholder="e.g. 1 Month" style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--card-bg)', color: 'var(--text-primary)' }} />
            </div>

            <div className="input-group">
              <label style={{ fontWeight: 600, marginBottom: '0.5rem', display: 'block' }}>Max Rental Period / Available Till *</label>
              <input required type="text" value={maxPeriod} onChange={e=>setMaxPeriod(e.target.value)} placeholder="e.g. June 2026" style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--card-bg)', color: 'var(--text-primary)' }} />
            </div>

            <div className="input-group md:col-span-2" style={{ gridColumn: '1/-1' }}>
              <label style={{ fontWeight: 600, marginBottom: '0.5rem', display: 'block' }}>Reason for Renting Out *</label>
              <select required value={rentReason} onChange={e=>setRentReason(e.target.value)} style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--card-bg)', color: 'var(--text-primary)' }}>
                {rentReasonsList.map(r => <option key={r}>{r}</option>)}
              </select>
            </div>

            <div className="input-group md:col-span-2" style={{ gridColumn: '1/-1', background: 'rgba(239, 68, 68, 0.1)', padding: '1.25rem', borderRadius: '8px', border: '1px dashed var(--danger)' }}>
              <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, color: 'var(--danger)', marginBottom: '1rem' }}><ShieldAlert size={18} /> Renting Terms & Policies</h4>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <input type="text" value={maintenance} onChange={e=>setMaintenance(e.target.value)} placeholder="Seller handles basic wear and tear" style={{ width: '100%', padding: '0.6rem', marginTop: '0.25rem', borderRadius: '4px', border: '1px solid var(--danger)', background: 'var(--card-bg)', color: 'var(--text-primary)' }} />
                </div>
                <div>
                  <input type="text" value={damagePolicy} onChange={e=>setDamagePolicy(e.target.value)} placeholder="Deduct from deposit" style={{ width: '100%', padding: '0.6rem', marginTop: '0.25rem', borderRadius: '4px', border: '1px solid var(--danger)', background: 'var(--card-bg)', color: 'var(--text-primary)' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--danger)' }}>Return Policy</label>
                  <input type="text" value={returnPolicy} onChange={e=>setReturnPolicy(e.target.value)} placeholder="Return in same condition & cleaned" style={{ width: '100%', padding: '0.6rem', marginTop: '0.25rem', borderRadius: '4px', border: '1px solid var(--danger)', background: 'var(--card-bg)', color: 'var(--text-primary)' }} />
                </div>
              </div>
            </div>
          </div>
        )}

        <button type="submit" disabled={loading} className="btn btn-primary" style={{ padding: '1.2rem', fontSize: '1.2rem', marginTop: '2rem', width: '100%', borderRadius: '16px', fontWeight: 800, boxShadow: 'var(--shadow-md)', transform: 'translateY(0)', transition: 'all var(--transition-smooth)' }}>
          {loading ? 'Processing...' : (editingItem ? 'Save Changes' : `Confirm Post: ${mode === 'sell' ? 'For Sale' : 'For Rent'}`)}
        </button>

      </form>
    </div>
  );
}
