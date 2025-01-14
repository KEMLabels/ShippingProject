import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import axios from "../api/axios";
import { FaCheckCircle, FaExclamationCircle } from "react-icons/fa";
import PageLayout from "../components/PageLayout";
import Button from "../components/Button";
import AlertMessage from "../components/AlertMessage";
import Log from "../components/Log";
import { useDispatch } from "react-redux";
import { setUserVerified } from "../redux/actions/UserAction";

export default function VerifyEmailConfirmation() {
  const param = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [fetching, setIsFetching] = useState(true);
  const [loading, setLoading] = useState(false);
  const [validURL, setValidURL] = useState(false);
  const [errMsg, setErrMsg] = useState("");
  const [linkErrMsg, setLinkErrMsg] = useState("");

  useEffect(() => {
    if (!param.id || !param.token) {
      setIsFetching(false);
      setValidURL(false);
      setErrMsg("An unexpected error occurred. Please try again later.");
      return;
    }

    axios
      .get(`/user/${param.id}/verify/${param.token}`, {
        withCredentials: true,
      })
      .then((res) => {
        Log(res);
        dispatch(setUserVerified(true));
        setValidURL(true);
      })
      .catch((e) => {
        Log("Error: ", e);
        setValidURL(false);
        if (
          e?.response?.data?.msg === "Link Invalid" ||
          e?.response?.data?.msg === "Link Expired"
        ) {
          setLinkErrMsg(e.response.data.msg);
        } else {
          setErrMsg("An unexpected error occurred. Please try again later."); // Axios default error
        }
      });
    setTimeout(() => {
      setIsFetching(false);
    }, 500);
  }, [param, dispatch]);

  function renderErrorHeading() {
    switch (linkErrMsg) {
      case "Link Invalid":
        return (
          <>
            <h1>Your email link is invalid!</h1>{" "}
            <p>
              <span>
                We're sorry, but your email link doesn't seem right. Please
                login and{" "}
              </span>
              <Link to="/verify-email" className="link">
                request a new link here.
              </Link>
            </p>
          </>
        );
      case "Link Expired":
        return (
          <>
            <h1>Your email link has expired!</h1>{" "}
            <p>
              <span>
                We're sorry, but your email link has expired. Please login and{" "}
              </span>
              <Link to="/verify-email" className="link">
                request a new link here.
              </Link>
            </p>
          </>
        );
      default:
        return (
          <>
            <h1>Uh oh! Something went wrong.</h1>{" "}
            <p>
              <span>
                We're sorry but something went wrong on our server. Please try{" "}
              </span>
              <Link to="/verify-email" className="link">
                requesting a new link here.
              </Link>
            </p>
          </>
        );
    }
  }

  return (
    <PageLayout
      title={validURL ? "Email Verified" : `Email ${linkErrMsg}`}
      description={
        validURL
          ? "Email Verified - Congratulations! Your email has been successfully verified. You can now access all the features and services of KEMLabels. Thank you for joining us!"
          : "Email Verification Failed - We're sorry, but the verification link you clicked is either invalid or has expired. Please request a new verification email or contact our support team for assistance."
      }
    >
      <div
        className="authContainer"
        style={{
          minHeight: "auto",
          justifyContent: "center",
          paddingTop: "5rem",
        }}
      >
        {fetching ? null : (
          <div className="authColumn">
            <div className="authHeader center">
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  marginBottom: "1.5rem",
                }}
              >
                {validURL ? (
                  <FaCheckCircle size={80} color="#00cc66" />
                ) : (
                  <FaExclamationCircle size={80} color="#ff0033" />
                )}
              </div>
              {validURL ? (
                <>
                  <h1>Your email has been verified!</h1>
                  <p>
                    <span>
                      Thank you for confirming your email address! You're all
                      set to begin your purchase.
                    </span>
                  </p>
                </>
              ) : (
                renderErrorHeading()
              )}
            </div>
            {errMsg && <AlertMessage msg={errMsg} type="error" />}
            <Button
              btnType="button"
              text="Return to home"
              loading={loading}
              onClickEvent={() => {
                setLoading(true);
                setTimeout(() => navigate("/"), 100);
              }}
              customStyle={{ width: "100%" }}
            />
          </div>
        )}
      </div>
    </PageLayout>
  );
}
