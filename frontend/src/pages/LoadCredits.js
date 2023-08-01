import React, { useEffect } from "react";
import { useSelector } from "react-redux";
import PageLayout from "../components/PageLayout";
import "../styles/Global.css";
import "../styles/LoadCredits.css";
import { FaBitcoin, FaRegCreditCard } from "react-icons/fa";

export default function LoadCredits() {
  const isLoggedIn = useSelector((state) => state.auth.isLoggedIn);

  useEffect(() => {
    if (!isLoggedIn) window.location.href = "/";
  }, [isLoggedIn]);

  return (
    <PageLayout title="Load Credits">
      <div
        className="authContainer"
        style={{
          minHeight: "auto",
          justifyContent: "center",
          paddingTop: "5rem",
        }}
      >
        <div className="authColumn" style={{ width: "100%" }}>
          <div className="authHeader">
            <div style={{ display: "flex", justifyContent: "center" }}>
              <img
                src="/media/paymentoption.jpg"
                alt="Payment option illustration"
                width="100%"
                style={{ maxWidth: "400px" }}
              />
            </div>
            <h1 style={{ textAlign: "center" }}>How do you want to load?</h1>
            <p style={{ opacity: "0.7", textAlign: "center" }}>
              Please choose one of the payment options below to get started.
            </p>
          </div>

          <div className="paymentOptionCardGroup">
            <div
              className="paymentOptionCard"
              onClick={() => {
                window.location.href = "/pay/creditcard";
              }}
            >
              <p>Credit / Debit Card</p>
              <FaRegCreditCard />
            </div>
            <div
              className="paymentOptionCard"
              onClick={() => {
                window.location.href = "/pay/crypto";
              }}
            >
              <p>Crypto Currency</p>
              <FaBitcoin />
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
