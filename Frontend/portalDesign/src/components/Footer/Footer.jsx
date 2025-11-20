import React, { useState } from "react";
import { FaLinkedin, FaGithub, FaEnvelope } from "react-icons/fa";
import ContactModal from "../ContactModal/ContactModal";
import "./Footer.css";

const Footer = () => {
  const [showModal, setShowModal] = useState(false);
  const currentYear = new Date().getFullYear();

  return (
    <>
      <footer className="footer" role="contentinfo">
        {/* Left Section: Contact (button for accessibility) */}
        <button
          className="footer-left"
          onClick={() => setShowModal(true)}
          aria-label="Open contact modal"
        >
          <FaEnvelope className="icon" />
          <span className="footer-contact">Contact</span>
        </button>

        {/* Center Section: Role + Year */}
        <div className="footer-center" aria-hidden="true">
          <span className="footer-center-text">
            ©{currentYear}
            <span className="role-title"> Java Developer</span>
          </span>
        </div>

        {/* Right Section: Social Icons */}
        <div className="footer-right">
          <a
            href="https://www.linkedin.com/in/your-profile"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="LinkedIn"
            className="contact-icon"
          >
            <FaLinkedin />
          </a>
          <a
            href="https://github.com/your-profile"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="GitHub"
            className="contact-icon"
          >
            <FaGithub />
          </a>
        </div>
      </footer>

      {showModal && <ContactModal onClose={() => setShowModal(false)} />}
    </>
  );
};

export default Footer;
