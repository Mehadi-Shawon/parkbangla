import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/common/ProtectedRoute';

// Public pages
import LandingPage        from './pages/LandingPage';
import LoginPage          from './pages/LoginPage';
import RegisterPage       from './pages/RegisterPage';
import ParkingSearchPage  from './pages/driver/ParkingSearchPage';
import ParkingDetailsPage from './pages/driver/ParkingDetailsPage';

// Driver pages
import DriverDashboard    from './pages/driver/DriverDashboard';
import ReservationPage    from './pages/driver/ReservationPage';
import BookingSuccess       from './pages/driver/BookingSuccess';
import ReservationStatus   from './pages/driver/ReservationStatus';
import ReservationHistory from './pages/driver/ReservationHistory';

// Owner pages
import OwnerDashboard     from './pages/owner/OwnerDashboard';
import ManageParking      from './pages/owner/ManageParking';
import AddEditParking     from './pages/owner/AddEditParking';
import OwnerReservations  from './pages/owner/OwnerReservations';
import OwnerManagers      from './pages/owner/OwnerManagers';
import OwnerActivityLog   from './pages/owner/OwnerActivityLog';

// Admin pages
import AdminDashboard     from './pages/admin/AdminDashboard';
import ManageUsers        from './pages/admin/ManageUsers';
import AdminParkings      from './pages/admin/AdminParkings';
import AdminReservations  from './pages/admin/AdminReservations';
import AdminActivityLog   from './pages/admin/AdminActivityLog';
import AdminManagers      from './pages/admin/AdminManagers';
import AdminAnalytics     from './pages/admin/AdminAnalytics';
import AdminMap           from './pages/admin/AdminMap';
import AdminPending       from './pages/admin/AdminPending';
import AdminParkOwners    from './pages/admin/AdminParkOwners';
import AdminSettings      from './pages/admin/AdminSettings';

// Manager
import ManagerDashboard      from './pages/manager/ManagerDashboard';
import ManagerReservations   from './pages/manager/ManagerReservations';

// Shared
import ProfilePage        from './pages/ProfilePage';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              borderRadius: '12px',
              fontSize:     '14px',
              fontFamily:   'Inter, sans-serif',
            },
          }}
        />
        <Routes>
          {/* Public */}
          <Route path="/"         element={<LandingPage />} />
          <Route path="/login"    element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/search"   element={<ParkingSearchPage />} />
          <Route path="/parking/:id" element={<ParkingDetailsPage />} />

          {/* Reservation status */}
          <Route path="/reservation/:id" element={
            <ProtectedRoute roles={['driver']}>
              <ReservationStatus />
            </ProtectedRoute>
          } />

          {/* Booking success */}
          <Route path="/booking/success" element={
            <ProtectedRoute roles={['driver']}>
              <BookingSuccess />
            </ProtectedRoute>
          } />

          {/* Driver */}
          <Route path="/dashboard" element={
            <ProtectedRoute roles={['driver']}>
              <DriverDashboard />
            </ProtectedRoute>
          } />
          <Route path="/reserve/:parkingId" element={
            <ProtectedRoute roles={['driver']}>
              <ReservationPage />
            </ProtectedRoute>
          } />
          <Route path="/reservations" element={
            <ProtectedRoute roles={['driver']}>
              <ReservationHistory />
            </ProtectedRoute>
          } />

          {/* Owner */}
          <Route path="/owner" element={
            <ProtectedRoute roles={['owner']}>
              <OwnerDashboard />
            </ProtectedRoute>
          } />
          <Route path="/owner/parking" element={
            <ProtectedRoute roles={['owner']}>
              <ManageParking />
            </ProtectedRoute>
          } />
          <Route path="/owner/parking/new" element={
            <ProtectedRoute roles={['owner']}>
              <AddEditParking />
            </ProtectedRoute>
          } />
          <Route path="/owner/parking/:id/edit" element={
            <ProtectedRoute roles={['owner']}>
              <AddEditParking />
            </ProtectedRoute>
          } />
          <Route path="/owner/reservations" element={
            <ProtectedRoute roles={['owner']}>
              <OwnerReservations />
            </ProtectedRoute>
          } />
          <Route path="/owner/managers" element={
            <ProtectedRoute roles={['owner']}>
              <OwnerManagers />
            </ProtectedRoute>
          } />
          <Route path="/owner/activity" element={
            <ProtectedRoute roles={['owner']}>
              <OwnerActivityLog />
            </ProtectedRoute>
          } />

          {/* Admin */}
          <Route path="/admin" element={
            <ProtectedRoute roles={['admin']}>
              <AdminDashboard />
            </ProtectedRoute>
          } />
          <Route path="/admin/users" element={
            <ProtectedRoute roles={['admin']}>
              <ManageUsers />
            </ProtectedRoute>
          } />
          <Route path="/admin/parking" element={
            <ProtectedRoute roles={['admin']}>
              <AdminParkings />
            </ProtectedRoute>
          } />
          <Route path="/admin/reservations" element={
            <ProtectedRoute roles={['admin']}>
              <AdminReservations />
            </ProtectedRoute>
          } />
          <Route path="/admin/managers" element={
            <ProtectedRoute roles={['admin']}>
              <AdminManagers />
            </ProtectedRoute>
          } />
          <Route path="/admin/activity" element={
            <ProtectedRoute roles={['admin']}>
              <AdminActivityLog />
            </ProtectedRoute>
          } />
          <Route path="/admin/analytics" element={
            <ProtectedRoute roles={['admin']}>
              <AdminAnalytics />
            </ProtectedRoute>
          } />
          <Route path="/admin/map" element={
            <ProtectedRoute roles={['admin']}>
              <AdminMap />
            </ProtectedRoute>
          } />
          <Route path="/admin/pending" element={
            <ProtectedRoute roles={['admin']}>
              <AdminPending />
            </ProtectedRoute>
          } />
          <Route path="/admin/park-owners" element={
            <ProtectedRoute roles={['admin']}>
              <AdminParkOwners />
            </ProtectedRoute>
          } />
          <Route path="/admin/settings" element={
            <ProtectedRoute roles={['admin']}>
              <AdminSettings />
            </ProtectedRoute>
          } />

          {/* Manager */}
          <Route path="/manager" element={
            <ProtectedRoute roles={['manager']}>
              <ManagerDashboard />
            </ProtectedRoute>
          } />
          <Route path="/manager/reservations" element={
            <ProtectedRoute roles={['manager']}>
              <ManagerReservations />
            </ProtectedRoute>
          } />

          {/* Shared */}
          <Route path="/profile" element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          } />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
