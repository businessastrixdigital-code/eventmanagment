import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import confetti from 'canvas-confetti';
import { 
  Heart, Calendar, MapPin, Sparkles, MessageCircle, Image as ImageIcon, Send, Lock, Eye, Globe, ChevronDown 
} from 'lucide-react';

export default function InvitationPage() {
  const { coupleSlug } = useParams();

  // Site Configuration & Content
  const [couple, setCouple] = useState(null);
  const [events, setEvents] = useState([]);
  const [customFields, setCustomFields] = useState([]);
  const [wishes, setWishes] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [languages, setLanguages] = useState([]);
  
  // Selected Language Pack
  const [currentLang, setCurrentLang] = useState('en');
  const [t, setT] = useState({});

  // Loading / Error
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Countdown State
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  // Guest Auth State
  const [guestToken, setGuestToken] = useState(localStorage.getItem('guest_token') || '');
  const [guestUser, setGuestUser] = useState(JSON.parse(localStorage.getItem('guest_user') || 'null'));
  const [isGuestApprovedForPhotos, setIsGuestApprovedForPhotos] = useState(false);

  // Guest OTP / Submission States
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [guestName, setGuestName] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [guestExists, setGuestExists] = useState(true);

  // RSVP Form Input values
  const [rsvpAnswers, setRsvpAnswers] = useState({}); // { [eventId]: 'Yes'/'No' }
  const [customFieldAnswers, setCustomFieldAnswers] = useState({}); // { [fieldId]: value }
  const [rsvpSuccess, setRsvpSuccess] = useState('');

  // Wish Form States
  const [wishName, setWishName] = useState('');
  const [wishMsg, setWishMsg] = useState('');
  const [wishSuccess, setWishSuccess] = useState('');

  const fetchWeddingData = async () => {
    try {
      const res = await fetch(`/api/public/wedding/${coupleSlug}`);
      if (res.ok) {
        const data = await res.json();
        setCouple(data.couple);
        setEvents(data.events || []);
        setCustomFields(data.customFields || []);
        setWishes(data.wishes || []);
        setPhotos(data.photos || []);
        setLanguages(data.languages || []);
        
        // Find language pack strings
        const langObj = data.languages?.find(l => l.code === currentLang) || data.languages?.find(l => l.code === 'en');
        if (langObj) setT(langObj.strings || {});

        // Fetch guest photo status if logged in
        if (guestToken) {
          fetchGuestPhotos(data.couple.id);
        }
      } else {
        setError('Invitation website details could not be found.');
      }
    } catch (err) {
      setError('Connection failure.');
    } finally {
      setLoading(false);
    }
  };

  const fetchGuestPhotos = async (coupleId) => {
    try {
      const res = await fetch('/api/guest/photos', {
        headers: { 'Authorization': `Bearer ${guestToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setPhotos(data.photos || []);
        setIsGuestApprovedForPhotos(data.photoAccessStatus === 'Approved');
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchWeddingData();
  }, [coupleSlug, currentLang, guestToken]);

  // Language pack switch handler
  useEffect(() => {
    if (languages.length > 0) {
      const langObj = languages.find(l => l.code === currentLang);
      if (langObj) setT(langObj.strings || {});
    }
  }, [currentLang, languages]);

  // Countdown timer calculation
  useEffect(() => {
    if (!couple?.weddingDate) return;

    const timer = setInterval(() => {
      const target = new Date(`${couple.weddingDate}T00:00:00`).getTime();
      const now = new Date().getTime();
      const difference = target - now;

      if (difference <= 0) {
        clearInterval(timer);
        setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      } else {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);
        setCountdown({ days, hours, minutes, seconds });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [couple]);

  // OTP Login triggers for Guest
  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setOtpError('');
    setOtpLoading(true);
    try {
      const res = await fetch('/api/auth/otp/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile, coupleSlug })
      });
      const data = await res.json();
      if (res.ok) {
        setOtpSent(true);
        setGuestExists(data.guestExists);
        alert(`[TESTING OTP] Code sent: ${data.otp}`);
      } else {
        setOtpError(data.error || 'Failed to send OTP.');
      }
    } catch (err) {
      setOtpError('Connection error.');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setOtpError('');
    setOtpLoading(true);
    try {
      const res = await fetch('/api/auth/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile, otp, name: guestName })
      });
      const data = await res.json();
      if (res.ok) {
        setGuestToken(data.token);
        setGuestUser(data.user);
        localStorage.setItem('guest_token', data.token);
        localStorage.setItem('guest_user', JSON.stringify(data.user));
        setOtpSent(false);
        setMobile('');
        setOtp('');
        setGuestName('');
      } else {
        setOtpError(data.error || 'Invalid OTP code.');
      }
    } catch (err) {
      setOtpError('Connection error.');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleLogoutGuest = () => {
    setGuestToken('');
    setGuestUser(null);
    setIsGuestApprovedForPhotos(false);
    localStorage.removeItem('guest_token');
    localStorage.removeItem('guest_user');
    setRsvpAnswers({});
    setCustomFieldAnswers({});
    setRsvpSuccess('');
  };

  // Submit RSVP
  const handleSubmitRsvp = async (e) => {
    e.preventDefault();
    setRsvpSuccess('');

    try {
      const res = await fetch('/api/guest/rsvp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${guestToken}`
        },
        body: JSON.stringify({
          rsvpStatus: rsvpAnswers,
          customFieldValues: customFieldAnswers
        })
      });
      const data = await res.json();
      if (res.ok) {
        setRsvpSuccess(t.rsvp_success || 'RSVP Submitted successfully!');
        
        // Trigger canvas confetti animation!
        confetti({
          particleCount: 150,
          spread: 80,
          origin: { y: 0.6 }
        });
      } else {
        alert(data.error || 'Failed to submit RSVP.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Post Wish
  const handlePostWish = async (e) => {
    e.preventDefault();
    setWishSuccess('');

    if (!wishName || !wishMsg) return;

    try {
      const res = await fetch(`/api/public/wedding/${coupleSlug}/wish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guestName: wishName, message: wishMsg })
      });
      if (res.ok) {
        setWishSuccess('Wish submitted! It will appear on the wall once approved by the couple.');
        setWishName('');
        setWishMsg('');
      } else {
        alert('Failed to submit wish.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Guest photo request trigger
  const handleRequestPhotoAccess = async () => {
    try {
      const res = await fetch('/api/guest/photo-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${guestToken}`
        }
      });
      if (res.ok) {
        alert('Access request submitted! Once the couple approves it, private albums will automatically unlock.');
        if (couple) fetchGuestPhotos(couple.id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSelectRsvp = (eventId, val) => {
    setRsvpAnswers(prev => ({
      ...prev,
      [eventId]: val
    }));
  };

  const handleCustomFieldChange = (fieldId, val) => {
    setCustomFieldAnswers(prev => ({
      ...prev,
      [fieldId]: val
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-wedding-beige">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-wedding-gold"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-wedding-beige p-6">
        <div className="bg-wedding-cream border border-wedding-gold/20 p-8 rounded-3xl text-center max-w-sm">
          <Heart className="h-10 w-10 text-red-400 mx-auto mb-4" />
          <h3 className="text-xl font-bold font-jost text-wedding-dark">Page Not Found</h3>
          <p className="text-xs text-wedding-brown/70 mt-2">{error}</p>
        </div>
      </div>
    );
  }

  // Generate dynamic custom themes values
  const themeStyles = {
    background: couple?.themeConfig?.colors?.background || '#F5EFE6',
    primary: couple?.themeConfig?.colors?.primary || '#6B4423',
    heading: couple?.themeConfig?.colors?.heading || '#4A2C17',
    accent: couple?.themeConfig?.colors?.accent || '#C9A66B',
    card: couple?.themeConfig?.colors?.card || '#FBF7F0'
  };

  // Compile section display lists based on settings sorting
  const sectionsList = couple?.themeConfig?.sections?.filter(s => s.visible) || [];

  return (
    <div style={{ backgroundColor: themeStyles.background }} className="min-h-screen relative font-poppins selection:bg-wedding-gold/20">
      
      {/* LANGUAGE SELECTION PACK & LOGOUT FLOATER */}
      <div className="absolute top-4 right-4 z-30 flex items-center gap-2">
        {languages.length > 1 && (
          <div className="relative inline-block text-left">
            <select 
              value={currentLang} 
              onChange={(e) => setCurrentLang(e.target.value)}
              className="bg-white/80 border border-wedding-gold/30 rounded-xl px-2.5 py-1 text-xs font-semibold text-wedding-dark focus:outline-none cursor-pointer"
            >
              {languages.map(l => (
                <option key={l.code} value={l.code}>{l.label}</option>
              ))}
            </select>
          </div>
        )}

        {guestToken && (
          <button 
            onClick={handleLogoutGuest} 
            className="bg-white/80 border border-red-200 text-red-600 rounded-xl px-2.5 py-1 text-xs font-semibold hover:bg-red-50"
          >
            Logout Guest
          </button>
        )}
      </div>

      {/* DYNAMIC SECTIONS IN REORDERED MATRIX */}
      {sectionsList.map((section) => {
        
        // 1. HERO SECTION
        if (section.id === 'hero') {
          return (
            <header key={section.id} className="relative min-h-screen flex flex-col items-center justify-center text-center p-6 bg-cover bg-center overflow-hidden" style={{ backgroundImage: couple?.coverPhoto ? `url(${couple.coverPhoto})` : 'none' }}>
              <div className="absolute inset-0 bg-black/35 z-0"></div>
              
              <div className="relative z-10 space-y-6 text-white animate-fade-in max-w-2xl px-4">
                <Heart className="h-10 w-10 text-white fill-white/10 mx-auto animate-pulse" />
                
                <h1 style={{ color: themeStyles.card }} className="text-5xl md:text-7xl font-bold font-jost tracking-wider drop-shadow-md">
                  {couple?.brideName} & {couple?.groomName}
                </h1>
                
                <p className="text-lg md:text-xl font-jost italic tracking-widest drop-shadow">
                  {t.welcome || "Welcome to our celebration"}
                </p>

                {couple?.weddingDate && (
                  <p className="text-sm font-semibold tracking-widest uppercase border-y border-white/20 py-2 inline-block px-6">
                    {new Date(couple.weddingDate).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>
                )}

                {/* Countdown Timer */}
                <div className="grid grid-cols-4 gap-4 max-w-sm mx-auto mt-8 bg-black/25 backdrop-blur-sm p-4 rounded-2xl border border-white/10">
                  <div className="text-center">
                    <span className="text-2xl md:text-3xl font-bold font-jost">{countdown.days}</span>
                    <span className="text-[10px] block uppercase font-bold tracking-wider opacity-85 mt-1">{t.days || "Days"}</span>
                  </div>
                  <div className="text-center">
                    <span className="text-2xl md:text-3xl font-bold font-jost">{countdown.hours}</span>
                    <span className="text-[10px] block uppercase font-bold tracking-wider opacity-85 mt-1">{t.hours || "Hours"}</span>
                  </div>
                  <div className="text-center">
                    <span className="text-2xl md:text-3xl font-bold font-jost">{countdown.minutes}</span>
                    <span className="text-[10px] block uppercase font-bold tracking-wider opacity-85 mt-1">{t.minutes || "Mins"}</span>
                  </div>
                  <div className="text-center">
                    <span className="text-2xl md:text-3xl font-bold font-jost">{countdown.seconds}</span>
                    <span className="text-[10px] block uppercase font-bold tracking-wider opacity-85 mt-1">{t.seconds || "Secs"}</span>
                  </div>
                </div>

                <div className="pt-6">
                  <a href="#rsvp" style={{ backgroundColor: themeStyles.accent, color: themeStyles.heading }} className="gold-button font-bold text-sm tracking-wider uppercase px-8 py-3">
                    {t.rsvp || "RSVP"}
                  </a>
                </div>
              </div>

              <div className="absolute bottom-10 left-1/2 -translate-x-1/2 text-white animate-bounce pointer-events-none">
                <ChevronDown className="h-6 w-6 opacity-75" />
              </div>
            </header>
          );
        }

        // 2. OUR STORY
        if (section.id === 'story') {
          return (
            <section key={section.id} id="story" className="py-20 px-6 max-w-4xl mx-auto text-center relative overflow-hidden">
              <div className="floral-divider">
                <Heart className="h-5 w-5" style={{ color: themeStyles.accent }} />
              </div>
              <h2 style={{ color: themeStyles.heading }} className="text-3xl md:text-4xl font-bold font-jost mb-6">
                {t.our_story || "Our Story"}
              </h2>
              <p style={{ color: themeStyles.primary }} className="text-sm md:text-base leading-loose max-w-2xl mx-auto italic font-medium">
                "{couple?.storyBio || "From partners in adventure to partners in life..."}"
              </p>
            </section>
          );
        }

        // 3. EVENTS TIMELINE
        if (section.id === 'timeline') {
          return (
            <section key={section.id} id="events" className="py-20 px-6 bg-white/45 relative">
              <div className="max-w-4xl mx-auto">
                <div className="floral-divider">
                  <Calendar className="h-5 w-5" style={{ color: themeStyles.accent }} />
                </div>
                <h2 style={{ color: themeStyles.heading }} className="text-3xl md:text-4xl font-bold font-jost text-center mb-12">
                  {t.events || "Celebration Events"}
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {events.map((evt) => (
                    <div 
                      key={evt.id} 
                      style={{ backgroundColor: themeStyles.card }} 
                      className="border border-wedding-gold/15 p-6 rounded-3xl shadow-wedding relative flex flex-col justify-between"
                    >
                      <div className="floral-corner-tl opacity-35"></div>
                      <div>
                        <span style={{ color: themeStyles.accent, borderColor: themeStyles.accent }} className="inline-block text-[10px] font-bold tracking-widest uppercase border px-2.5 py-0.5 rounded-full mb-4">
                          {evt.type}
                        </span>
                        <h3 style={{ color: themeStyles.heading }} className="text-xl font-bold font-jost mb-2">{evt.title}</h3>
                        <p className="text-xs text-wedding-brown/70 leading-relaxed mb-4">{evt.description}</p>
                      </div>

                      <div className="space-y-2 text-xs text-wedding-brown/80 font-medium border-t border-wedding-gold/10 pt-4 mt-4">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-wedding-gold" />
                          <span>{evt.date} @ {evt.time}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-wedding-gold" />
                          <span className="truncate">{evt.venue}</span>
                        </div>
                        {evt.dressCode && (
                          <div className="flex items-center gap-2">
                            <Sparkles className="h-4 w-4 text-wedding-gold" />
                            <span>{t.dress_code || "Dress Code"}: <strong>{evt.dressCode}</strong></span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          );
        }

        // 4. PHOTO GALLERY
        if (section.id === 'gallery') {
          return (
            <section key={section.id} id="gallery" className="py-20 px-6 max-w-5xl mx-auto">
              <div className="floral-divider">
                <ImageIcon className="h-5 w-5" style={{ color: themeStyles.accent }} />
              </div>
              <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-4">
                <h2 style={{ color: themeStyles.heading }} className="text-3xl md:text-4xl font-bold font-jost text-center md:text-left">
                  {t.gallery || "Wedding Album"}
                </h2>

                {/* Photo unlock logic */}
                {!guestToken ? (
                  <p className="text-xs text-wedding-brown/70 font-semibold bg-white p-2.5 rounded-2xl border border-wedding-gold/10">
                    🔐 Login as Guest below to request photo access to restricted albums.
                  </p>
                ) : !isGuestApprovedForPhotos ? (
                  <button 
                    onClick={handleRequestPhotoAccess}
                    className="outline-button flex items-center gap-1.5 text-xs py-2"
                  >
                    <Lock className="h-4 w-4 text-wedding-gold" />
                    {t.request_photos || "Request Private Album Access"}
                  </button>
                ) : (
                  <span className="bg-green-50 border border-green-200 text-green-800 text-xs font-semibold px-4 py-1.5 rounded-full flex items-center gap-1.5 shadow-sm">
                    <Globe className="h-4 w-4" />
                    Private Albums Unlocked
                  </span>
                )}
              </div>

              {photos.length === 0 ? (
                <p className="text-sm text-wedding-brown/50 italic text-center py-12">No public gallery photos uploaded yet.</p>
              ) : (
                <div className="columns-1 sm:columns-2 md:columns-3 gap-6 space-y-6">
                  {photos.map((ph) => (
                    <div key={ph.id} className="break-inside-avoid bg-white border border-wedding-gold/10 rounded-2xl overflow-hidden shadow-sm group">
                      <img src={ph.url} alt="Wedding gallery" className="w-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      {ph.privacy !== 'Public' && (
                        <div className="p-2 bg-amber-50 text-[10px] text-amber-800 font-semibold border-t border-amber-100 flex items-center gap-1">
                          <Lock className="h-3 w-3" />
                          Private Album photo
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
          );
        }

        // 5. RSVP FORM
        if (section.id === 'rsvp') {
          return (
            <section key={section.id} id="rsvp" className="py-20 px-6 bg-white/45 relative">
              <div className="max-w-md mx-auto">
                <div className="floral-divider">
                  <Heart className="h-5 w-5" style={{ color: themeStyles.accent }} />
                </div>
                <h2 style={{ color: themeStyles.heading }} className="text-3xl md:text-4xl font-bold font-jost text-center mb-8">
                  {t.rsvp || "RSVP Online"}
                </h2>

                {rsvpSuccess && (
                  <div className="bg-green-50 border-l-4 border-green-400 p-4 rounded-xl text-sm text-green-700 mb-6 text-center">
                    {rsvpSuccess}
                  </div>
                )}

                {/* RSVP LOGIN FLOW FOR NON-LOGGED GUEST */}
                {!guestToken ? (
                  <div style={{ backgroundColor: themeStyles.card }} className="border border-wedding-gold/15 p-6 rounded-3xl shadow-wedding relative">
                    <div className="floral-corner-tl opacity-55"></div>
                    <span className="text-xs font-bold text-wedding-brown/50 uppercase block mb-4 text-center">Verify Invitation Access</span>
                    
                    {otpError && (
                      <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-xl text-sm text-red-700 mb-4">
                        {otpError}
                      </div>
                    )}

                    {!otpSent ? (
                      <form onSubmit={handleRequestOtp} className="space-y-4">
                        <div>
                          <label className="block text-xs font-semibold uppercase text-wedding-brown/70 mb-1">Mobile Number</label>
                          <input 
                            type="text" 
                            required 
                            value={mobile} 
                            onChange={(e) => setMobile(e.target.value)} 
                            className="wedding-input" 
                            placeholder="Phone number on invitation"
                          />
                        </div>
                        <button type="submit" disabled={otpLoading} className="gold-button w-full">
                          {otpLoading ? 'Sending...' : 'Request OTP code'}
                        </button>
                      </form>
                    ) : (
                      <form onSubmit={handleVerifyOtp} className="space-y-4">
                        {!guestExists && (
                          <div>
                            <label className="block text-xs font-semibold uppercase text-wedding-brown/70 mb-1">Full Name (New registration)</label>
                            <input 
                              type="text" 
                              required 
                              value={guestName} 
                              onChange={(e) => setGuestName(e.target.value)} 
                              className="wedding-input" 
                              placeholder="Your full name"
                            />
                          </div>
                        )}
                        <div>
                          <label className="block text-xs font-semibold uppercase text-wedding-brown/70 mb-1">Enter 6-Digit OTP</label>
                          <input 
                            type="text" 
                            required 
                            maxLength={6}
                            value={otp} 
                            onChange={(e) => setOtp(e.target.value)} 
                            className="wedding-input tracking-widest text-center text-lg font-bold" 
                            placeholder="••••••"
                          />
                        </div>
                        
                        <div className="flex gap-2">
                          <button type="button" onClick={() => setOtpSent(false)} className="flex-1 outline-button py-2 text-xs">Back</button>
                          <button type="submit" disabled={otpLoading} className="flex-1 gold-button py-2 text-xs">Verify Code</button>
                        </div>
                      </form>
                    )}
                  </div>
                ) : (
                  /* THE ACTUAL DYNAMIC RSVP FORM */
                  <form onSubmit={handleSubmitRsvp} style={{ backgroundColor: themeStyles.card }} className="border border-wedding-gold/15 p-8 rounded-3xl shadow-wedding space-y-6 relative">
                    <div className="floral-corner-tl opacity-55"></div>
                    <div className="text-center border-b border-wedding-gold/10 pb-4">
                      <span className="text-xs text-wedding-brown/50 font-bold block uppercase">Welcome</span>
                      <h4 className="text-md font-bold text-wedding-dark">{guestUser?.name}</h4>
                    </div>

                    {/* RSVP choices per event */}
                    {events.map((evt) => (
                      <div key={evt.id} className="border-b border-wedding-gold/10 pb-4 space-y-2">
                        <label className="block text-xs font-bold text-wedding-dark">{evt.title}</label>
                        <div className="flex gap-4">
                          <button 
                            type="button"
                            onClick={() => handleSelectRsvp(evt.id, 'Yes')}
                            className={`flex-1 py-2 text-xs font-semibold border rounded-xl transition-all ${
                              rsvpAnswers[evt.id] === 'Yes' 
                                ? 'bg-wedding-brown border-wedding-brown text-wedding-cream shadow-sm' 
                                : 'bg-white border-wedding-brown/20 text-wedding-brown hover:bg-wedding-beige/10'
                            }`}
                          >
                            Attending
                          </button>
                          <button 
                            type="button"
                            onClick={() => handleSelectRsvp(evt.id, 'No')}
                            className={`flex-1 py-2 text-xs font-semibold border rounded-xl transition-all ${
                              rsvpAnswers[evt.id] === 'No' 
                                ? 'bg-wedding-brown border-wedding-brown text-wedding-cream shadow-sm' 
                                : 'bg-white border-wedding-brown/20 text-wedding-brown hover:bg-wedding-beige/10'
                            }`}
                          >
                            Declined
                          </button>
                        </div>
                      </div>
                    ))}

                    {/* DYNAMIC CUSTOM RSVP FIELDS */}
                    {customFields.map((field) => (
                      <div key={field.id} className="space-y-1.5">
                        <label className="block text-xs font-bold text-wedding-dark">
                          {field.label}
                          {field.required && <span className="text-red-500 ml-0.5">*</span>}
                        </label>

                        {field.type === 'dropdown' ? (
                          <select 
                            required={field.required}
                            value={customFieldAnswers[field.id] || ''}
                            onChange={(e) => handleCustomFieldChange(field.id, e.target.value)}
                            className="wedding-input py-2 text-xs"
                          >
                            <option value="">Select option</option>
                            {field.options?.map((opt, idx) => (
                              <option key={idx} value={opt}>{opt}</option>
                            ))}
                          </select>
                        ) : field.type === 'checkbox' ? (
                          <label className="flex items-center gap-2 text-xs font-medium cursor-pointer text-wedding-dark">
                            <input 
                              type="checkbox" 
                              checked={!!customFieldAnswers[field.id]}
                              onChange={(e) => handleCustomFieldChange(field.id, e.target.checked)}
                              className="accent-wedding-brown h-4.5 w-4.5"
                            />
                            Confirm selection
                          </label>
                        ) : (
                          <input 
                            type={field.type}
                            required={field.required}
                            value={customFieldAnswers[field.id] || ''}
                            onChange={(e) => handleCustomFieldChange(field.id, e.target.value)}
                            className="wedding-input py-2 text-xs"
                          />
                        )}
                      </div>
                    ))}

                    <button type="submit" className="gold-button w-full mt-4">
                      {t.submit_rsvp || "Submit RSVP"}
                    </button>

                    {/* QR Code and check in */}
                    <div className="border-t border-wedding-gold/15 pt-6 mt-6 flex flex-col items-center">
                      <span className="text-[10px] font-bold text-wedding-brown/50 uppercase block mb-3">Your Event Check-in QR Code</span>
                      <div className="bg-white p-3 rounded-2xl border border-wedding-gold/10">
                        <QRCodeSVG 
                          value={JSON.stringify({ guestId: guestUser?.id, action: 'checkin', slug: coupleSlug })}
                          size={110} 
                        />
                      </div>
                      <p className="text-[9px] text-wedding-brown/60 mt-2 text-center">Present this QR code to the venue arrival staff.</p>
                    </div>
                  </form>
                )}
              </div>
            </section>
          );
        }

        // 6. WISHES WALL
        if (section.id === 'wishes') {
          return (
            <section key={section.id} id="wishes" className="py-20 px-6 max-w-4xl mx-auto">
              <div className="floral-divider">
                <MessageCircle className="h-5 w-5" style={{ color: themeStyles.accent }} />
              </div>
              <h2 style={{ color: themeStyles.heading }} className="text-3xl md:text-4xl font-bold font-jost text-center mb-12">
                {t.wishes || "Wishes Wall"}
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
                {/* Wish posting form */}
                <div className="md:col-span-1">
                  <div style={{ backgroundColor: themeStyles.card }} className="border border-wedding-gold/15 p-6 rounded-3xl shadow-wedding relative">
                    <h3 style={{ color: themeStyles.heading }} className="text-md font-bold font-jost mb-4">{t.leave_wish || "Leave a Wish"}</h3>
                    
                    {wishSuccess && (
                      <div className="bg-green-50 border-l-4 border-green-400 p-3 rounded-xl text-xs text-green-700 mb-4">
                        {wishSuccess}
                      </div>
                    )}

                    <form onSubmit={handlePostWish} className="space-y-4">
                      <div>
                        <input 
                          type="text" 
                          required 
                          value={wishName} 
                          onChange={(e) => setWishName(e.target.value)} 
                          className="wedding-input py-1.5 text-xs" 
                          placeholder="Your Name"
                        />
                      </div>
                      <div>
                        <textarea 
                          rows={3} 
                          required 
                          value={wishMsg} 
                          onChange={(e) => setWishMsg(e.target.value)} 
                          className="wedding-input text-xs" 
                          placeholder="Your message to the couple..."
                        />
                      </div>
                      <button type="submit" className="gold-button w-full text-xs py-2 flex items-center justify-center gap-1.5">
                        <Send className="h-3 w-3" />
                        Send Wish
                      </button>
                    </form>
                  </div>
                </div>

                {/* Wishes display scrollable board */}
                <div className="md:col-span-2 space-y-4 max-h-[400px] overflow-y-auto pr-2">
                  {wishes.length === 0 ? (
                    <p className="text-xs text-wedding-brown/50 italic text-center py-10 bg-white border border-wedding-gold/5 rounded-2xl p-6">No wishes posted yet. Be the first to congratulate the couple!</p>
                  ) : (
                    wishes.map((w) => (
                      <div key={w.id} className="bg-white border border-wedding-gold/10 rounded-2xl p-5 shadow-sm relative">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-semibold text-wedding-dark text-sm">{w.guestName}</h4>
                          <span className="text-[9px] text-wedding-brown/40 font-semibold font-mono">{new Date(w.createdAt).toLocaleDateString()}</span>
                        </div>
                        <p className="text-xs leading-relaxed text-wedding-brown/80 italic">"{w.message}"</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </section>
          );
        }

        return null;
      })}

      {/* FOOTER */}
      <footer className="py-8 bg-wedding-dark text-wedding-cream text-center text-xs tracking-wider border-t border-wedding-gold/20">
        <Heart className="h-4 w-4 text-wedding-gold fill-wedding-gold/20 mx-auto mb-2 animate-pulse" />
        <p className="font-jost uppercase tracking-widest">{couple?.brideName} & {couple?.groomName}'s Wedding Site</p>
        <p className="opacity-60 text-[10px] mt-1.5">Designed with Elegance © 2026</p>
      </footer>
    </div>
  );
}
