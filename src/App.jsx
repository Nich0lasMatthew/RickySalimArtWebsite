import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Gallery from "./pages/Gallery";
import Artwork from "./pages/Artwork";
import About from "./pages/About";
import Enquiry from "./pages/Enquiry";
import CarrotCards from "./pages/CarrotCards";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/gallery" element={<Gallery />} />
        <Route path="/artwork/:id" element={<Artwork />} />
        <Route path="/about" element={<About />} />
        <Route path="/enquiry" element={<Enquiry />} />
        <Route path="/carrot-cards" element={<CarrotCards />} />
      </Routes>
    </BrowserRouter>
  );
}
