import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { LanguageProvider } from "@/context/LanguageContext";
import Layout from "@/components/Layout";
import Home from "@/pages/Home";
import ChatCompanion from "@/pages/ChatCompanion";
import ComplaintTracker from "@/pages/ComplaintTracker";
import ServiceFinder from "@/pages/ServiceFinder";
import DocumentGuidance from "@/pages/DocumentGuidance";

function App() {
  return (
    <div className="App">
      <LanguageProvider>
        <BrowserRouter>
          <Layout>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/chat" element={<ChatCompanion />} />
              <Route path="/complaints" element={<ComplaintTracker />} />
              <Route path="/services" element={<ServiceFinder />} />
              <Route path="/documents" element={<DocumentGuidance />} />
            </Routes>
          </Layout>
        </BrowserRouter>
      </LanguageProvider>
    </div>
  );
}

export default App;
