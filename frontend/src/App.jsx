import { BrowserRouter, Routes, Route } from "react-router-dom";
import AuthProvider from "./auth/AuthProvider";
import RequireRole from "./auth/RequireRole";
import Home from "./pages/Home";
import Gallery from "./pages/Gallery";
import Artwork from "./pages/Artwork";
import About from "./pages/About";
import Enquiry from "./pages/Enquiry";
import CarrotCards from "./pages/CarrotCards";
import Login from "./pages/Login";
import Account from "./pages/Account";
import Admin from "./pages/Admin";
import NotFound from "./pages/NotFound";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Everyone */}
          <Route path="/" element={<Home />} />
          <Route path="/gallery" element={<Gallery />} />
          <Route path="/artwork/:id" element={<Artwork />} />
          <Route path="/about" element={<About />} />
          <Route path="/enquiry" element={<Enquiry />} />
          <Route path="/carrot-cards" element={<CarrotCards />} />
          <Route path="/login" element={<Login />} />

          {/* Signed-in users */}
          <Route path="/account" element={<RequireRole><Account /></RequireRole>} />

          {/* Admins */}
          <Route path="/admin" element={<RequireRole role="admin"><Admin /></RequireRole>} />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
