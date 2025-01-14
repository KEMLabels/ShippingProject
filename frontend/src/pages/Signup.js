import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { GoArrowLeft } from "react-icons/go";
import axios from "../api/axios";
import "../styles/Global.css";
import "../styles/Auth.css";
import Button from "../components/Button";
import { DefaultField, PasswordField } from "../components/Field";
import PageLayout from "../components/PageLayout";
import AlertMessage from "../components/AlertMessage";
import { setUser } from "../redux/actions/UserAction";
import {
  validateEmailOnSubmit,
  validatePasswordOnSubmit,
  validateUsernameOnSubmit,
} from "../utils/Validation";
import {
  getCurrDateTimeInISO,
  validatePasswordOnTyping,
} from "../utils/Helpers";
import Log from "../components/Log";

export default function Signup() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const isLoggedIn = useSelector((state) => state.user.isLoggedIn);

  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [inputUserName, setInputUserName] = useState("");
  const [inputEmail, setInputEmail] = useState("");
  const [inputPassword, setInputPassword] = useState("");
  const [passwordValid, setPasswordValid] = useState({
    length: true,
    uppercase: true,
    number: true,
    specialChar: true,
  });

  useEffect(() => {
    if (isLoggedIn) navigate("/verify-email");
  }, [isLoggedIn, navigate]);

  // Validate all fields before submitting
  function validateFields() {
    // empty field validation
    if (inputUserName === "" || inputEmail === "" || inputPassword === "") {
      setErrMsg("Please fill out all fields.");
      return false;
    }

    // username, email, password validation
    const usernameValid = validateUsernameOnSubmit(
      inputUserName,
      setFieldErrors
    );
    const emailValid = validateEmailOnSubmit(inputEmail, setFieldErrors);
    const passwordValid = validatePasswordOnSubmit(
      inputPassword,
      setFieldErrors
    );

    if (!usernameValid || !emailValid || !passwordValid) return false;
    return true;
  }

  const submit = (e) => {
    e.preventDefault();
    setLoading(true);
    setFieldErrors({});

    if (!validateFields()) {
      setLoading(false);
      return;
    }

    axios
      .post(
        "/auth/signup",
        { userName: inputUserName, email: inputEmail, password: inputPassword },
        { withCredentials: true }
      )
      .then((res) => {
        Log("Signup Response: ", res);
        dispatch(
          setUser(
            inputUserName,
            inputEmail,
            0,
            0,
            getCurrDateTimeInISO(),
            true,
            false
          )
        );
        navigate(res.data.redirect || "/verify-email");
      })
      .catch((e) => {
        const resp = e?.response?.data?.msg;
        Log("Error: ", e);
        if (resp === "This username is already taken.") {
          setFieldErrors((currentErrors) => ({
            ...currentErrors,
            username: e.response.data.msg,
          }));
        } else if (
          resp === "This email is already associated with an account."
        ) {
          setFieldErrors((currentErrors) => ({
            ...currentErrors,
            email: e.response.data.msg,
          }));
        } else {
          setErrMsg("An unexpected error occurred. Please try again later."); // Axios default error
        }
      })
      .finally(() => {
        setLoading(false);
      });
  };

  return (
    <PageLayout
      title="Sign Up"
      description="Sign Up with KEMLabels - Join our community of shippers and start your joruney. Create an account to order shipping labels, track your credit history, and more. Get started with KEMLabels today!"
      hideNavAndFooter
    >
      <div className="authContainer">
        <div className="authColumn">
          <div className="backToHome">
            <Link to="/" className="link">
              <GoArrowLeft size={18} style={{ marginTop: "2px" }} />
              <p>Back to Home</p>
            </Link>
          </div>
          <div className="authHeader">
            <h1>Create an account</h1>
            <p>
              <span>Let's get started with a free account.</span>
            </p>
          </div>
          {errMsg && <AlertMessage msg={errMsg} type="error" />}
          <form action="POST" className="authFormContainer">
            <DefaultField
              label="Username"
              onChangeEvent={(e) => {
                setInputUserName(e.target.value.trim().toLowerCase());
                setErrMsg("");
              }}
              placeholder="johndoe"
              minLength={3}
              maxLength={15}
              error={fieldErrors?.username}
            />
            <DefaultField
              label="Email"
              fieldType="email"
              onChangeEvent={(e) => {
                setInputEmail(e.target.value.trim().toLowerCase());
                setErrMsg("");
              }}
              placeholder="johndoe@gmail.com"
              minLength={3}
              maxLength={100}
              error={fieldErrors?.email}
            />
            <PasswordField
              label="Password"
              onChangeEvent={(e) => {
                setInputPassword(e.target.value.trim());
                validatePasswordOnTyping(
                  e.target.value.trim(),
                  setPasswordValid
                );
                setErrMsg("");
              }}
              minLength={8}
              maxLength={50}
              error={fieldErrors?.password}
            />
            <div className="passwordRequirements">
              <p>Password must include:</p>
              <ul>
                <li className={passwordValid.length ? "" : "invalidPassword"}>
                  8 - 50 characters
                </li>
                <li
                  className={passwordValid.uppercase ? "" : "invalidPassword"}
                >
                  1 uppercase letter
                </li>
                <li className={passwordValid.number ? "" : "invalidPassword"}>
                  1 number
                </li>
                <li
                  className={passwordValid.specialChar ? "" : "invalidPassword"}
                >
                  1 special character
                </li>
              </ul>
            </div>
            <Button
              btnType="submit"
              onClickEvent={submit}
              loading={loading}
              text="Create account"
            />
            <p className="disclaimer">
              By signing up to create an account I accept KEMLabel's{" "}
              <Link className="link" to="/terms-and-conditions">
                Terms and Conditions
              </Link>{" "}
              and{" "}
              <Link className="link" to="/privacy-policy">
                Privacy Policy
              </Link>
              .
            </p>
          </form>
          <div style={{ width: "100%", textAlign: "center" }}>
            <span style={{ opacity: 0.5 }}>Already have an account? </span>
            <Link to="/signin" className="link">
              Sign In
            </Link>
          </div>
        </div>
        <div className="authColumn">
          <img
            src="/media/signup.jpg"
            width="100%"
            alt="Illustration of a man signing up by unlocking lock with a key."
          />
        </div>
      </div>
    </PageLayout>
  );
}
