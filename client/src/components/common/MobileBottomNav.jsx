import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const TABS = {
  driver: [
    {
      to: '/dashboard', exact: true, label: 'Home',
      icon: ({ active }) => (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2.5 : 1.8}
            d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
        </svg>
      ),
    },
    {
      to: '/search', label: 'Search',
      icon: ({ active }) => (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2.5 : 2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
        </svg>
      ),
    },
    {
      to: '/reservations', label: 'Bookings',
      icon: ({ active }) => (
        <svg className="w-5 h-5" fill={active ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 0 : 1.8}
            d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"/>
        </svg>
      ),
    },
    {
      to: '/profile', label: 'Profile',
      icon: ({ active }) => (
        <svg className="w-5 h-5" fill={active ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 0 : 1.8}
            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
        </svg>
      ),
    },
  ],
  owner: [
    {
      to: '/owner', exact: true, label: 'Dashboard',
      icon: ({ active }) => (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2.5 : 2}
            d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
        </svg>
      ),
    },
    {
      to: '/owner/parking', label: 'Lots',
      icon: ({ active }) => (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2.5 : 2}
            d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0H5"/>
        </svg>
      ),
    },
    {
      to: '/owner/reservations', label: 'Bookings',
      icon: ({ active }) => (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2.5 : 2}
            d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"/>
        </svg>
      ),
    },
    {
      to: '/profile', label: 'Profile',
      icon: ({ active }) => (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2.5 : 2}
            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
        </svg>
      ),
    },
  ],
};

export default function MobileBottomNav() {
  const { user } = useAuth();

  // Only show for driver and owner roles
  if (!user || !['driver', 'owner'].includes(user.role)) return null;

  const tabs = TABS[user.role] || [];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-gray-100"
      style={{ background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="flex items-stretch">
        {tabs.map(tab => (
          <NavLink key={tab.to} to={tab.to} end={tab.exact}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center justify-center py-3 gap-1 transition-colors ${isActive ? 'text-indigo-600' : 'text-gray-400'}`
            }>
            {({ isActive }) => (
              <>
                <div className={`transition-all duration-200 ${isActive ? 'scale-110' : ''}`}>
                  <tab.icon active={isActive}/>
                </div>
                <span className={`text-[10px] font-semibold ${isActive ? 'text-indigo-600' : 'text-gray-400'}`}>
                  {tab.label}
                </span>
                {isActive && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full bg-indigo-600"/>
                )}
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
