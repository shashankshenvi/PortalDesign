// src/components/ContactModal/ContactModal.jsx
import React, { useEffect, useRef } from "react";
import "./ContactModal.css";
import {
  FaUser,
  FaPhone,
  FaEnvelope,
  FaDownload,
  FaGithub,
  FaLinkedin,
  FaTimes,
} from "react-icons/fa";

/**
 * ContactModal
 * Props:
 *  - onClose: function called when user requests close
 *  - open (optional): boolean whether modal is visible (defaults true)
 *
 * Behavior:
 *  - closes on backdrop click and ESC
 *  - returns focus to previous element on close
 */
const ContactModal = ({ onClose, open = true }) => {
  const modalRef = useRef(null);
  const previouslyFocused = useRef(null);

  useEffect(() => {
    if (!open) return;

    previouslyFocused.current = document.activeElement;

    // Focus the modal container so screen readers know we moved into a dialog.
    const firstFocusable = modalRef.current?.querySelector(
      'button, [href], input, textarea, select, [tabindex]:not([tabindex="-1"])'
    );
    (firstFocusable || modalRef.current)?.focus();

    const onKey = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose?.();
      }
      // Simple trap: keep focus inside modal when Tab pressed
      if (e.key === "Tab") {
        const focusable = modalRef.current.querySelectorAll(
          'a[href], button:not([disabled]), input, textarea, select, [tabindex]:not([tabindex="-1"])'
        );
        if (!focusable || focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      if (previouslyFocused.current?.focus) previouslyFocused.current.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="cm-backdrop"
      onMouseDown={(e) => {
        // close if backdrop (not clicks inside the modal)
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div
        className="cm-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cm-title"
        ref={modalRef}
        tabIndex={-1}
      >
        <header className="cm-header">
          <h2 id="cm-title">Contact</h2>
          <button
            className="cm-close"
            onClick={onClose}
            aria-label="Close contact dialog"
          >
            <FaTimes />
          </button>
        </header>

        <div className="cm-body">
          <div className="cm-row">
            <FaUser className="cm-icon" aria-hidden />
            <div className="cm-text">
              <div className="cm-label">Name</div>
              <div className="cm-value">Shashank</div>
            </div>
          </div>

          <div className="cm-row">
            <FaPhone className="cm-icon" aria-hidden />
            <div className="cm-text">
              <div className="cm-label">Phone</div>
              <div className="cm-value">+91 94826 99824</div>
            </div>
          </div>

          <div className="cm-row">
            <FaEnvelope className="cm-icon" aria-hidden />
            <div className="cm-text">
              <div className="cm-label">Email</div>
              <div className="cm-value">
                <a href="mailto:shashankshenvi04@gmail.com">
                  shashankshenvi04@gmail.com
                </a>
              </div>
            </div>
          </div>

          <div className="cm-row">
            <FaDownload className="cm-icon" aria-hidden />
            <div className="cm-text">
              <div className="cm-label">Resume</div>
              <div className="cm-value">
                <a
                  className="cm-download"
                  href="/resume.pdf"
                  download
                  rel="noreferrer"
                >
                  Download Resume
                </a>
              </div>
            </div>
          </div>

          <div className="cm-row">
            <FaGithub className="cm-icon" aria-hidden />
            <div className="cm-text">
              <div className="cm-label">GitHub</div>
              <div className="cm-value">
                <a
                  href="https://github.com/shashankshenvi"
                  target="_blank"
                  rel="noreferrer"
                >
                  github.com/shashankshenvi
                </a>
              </div>
            </div>
          </div>

          <div className="cm-row">
            <FaLinkedin className="cm-icon" aria-hidden />
            <div className="cm-text">
              <div className="cm-label">LinkedIn</div>
              <div className="cm-value">
                <a
                  href="https://www.linkedin.com/in/shashank-shenvi/"
                  target="_blank"
                  rel="noreferrer"
                >
                  linkedin.com/in/shashank-shenvi
                </a>
              </div>
            </div>
          </div>
        </div>

        <footer className="cm-footer">
          <button className="btn cm-primary" onClick={onClose}>
            Close
          </button>
        </footer>
      </div>
    </div>
  );
};

export default ContactModal;
