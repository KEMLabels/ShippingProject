import React, { useState } from "react";
import { Link } from "react-router-dom";
import { FaBars, FaEnvelope, FaTelegramPlane } from "react-icons/fa";
import { IoCloseSharp } from "react-icons/io5";
import NavLink from "./NavLink";
import "../styles/Global.css";
import "../styles/Navbar.css";

export default function HamburgerMenu({ sessionStatus = false }) {
  const [showHamburgerMenu, setShowHamburgerMenu] = useState(false);

  // Hides menu when user clicks outside of menu
  function HideHamburgerOnWindowClick() {
    window.onclick = (e) => {
      if (showHamburgerMenu && !e.target.matches(".hamburgerMenu")) {
        closeHamburgerMenu();
      }
    };
  }

  function openHamburgerMenu() {
    document.body.style.overflow = "hidden";
    setShowHamburgerMenu(true);
  }

  function closeHamburgerMenu() {
    document.body.style.overflow = null;
    setShowHamburgerMenu(false);
  }

  return (
    <div className="mobileNav">
      <button
        className="iconButton"
        style={{ marginTop: "5px" }}
        onClick={openHamburgerMenu}
      >
        <FaBars size={24} />
      </button>
      <div
        className={`hamburgerMenu ${showHamburgerMenu ? "active" : ""}`}
        onTransitionEnd={HideHamburgerOnWindowClick}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "1rem",
          }}
        >
          <Link to="/" className="logo">
            <img src="/logo/logo.svg" alt="KEMLabels logo" />
          </Link>

          <button className="iconButton" onClick={closeHamburgerMenu}>
            <IoCloseSharp size={24} style={{ marginTop: "5px" }} />
          </button>
        </div>
        <div className="mobNavLinksContainer">
          <NavLink
            type="howitworks"
            text="How It Works"
            link="/#howitworks"
            isNavlink={false}
          />
          <NavLink type="faq" text="FAQ" link="/#faq" isNavlink={false} />
          {!sessionStatus ? (
            <>
              <NavLink type="signin" text="Sign In" link="/signin" />
              <NavLink type="signup" text="Get Started" link="/signup" />
            </>
          ) : (
            <>
              <NavLink type="order" text="Order Label" link="/order-label" />
              <hr />
              <NavLink
                type="account"
                text="Account Settings"
                link="/account/change-username"
              />
              <NavLink type="load" text="Load Credits" link="/load-credits" />
              <NavLink
                type="history"
                text="Credit History"
                link="/credit-history"
              />
              <NavLink
                type="logout"
                text="Logout"
                link="/signin"
                isNavlink={false}
                linkOnClick
              />
            </>
          )}
        </div>
        <div className="mobContact">
          <p>Contact us at:</p>
          <div className="contactInfo">
            {/* TODO: Update contact info */}
            <a href="https://t.me/kemlabels" target="_blank" rel="noreferrer">
              <FaTelegramPlane size={16} />
              <span>@kemlabels</span>
            </a>
            <a href="mailto:support@kemlabels.com">
              <FaEnvelope size={16} />
              <span>support@kemlabels.com</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
