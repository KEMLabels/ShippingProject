import React, { useEffect, useState } from "react";
import PageLayout from "../components/PageLayout";
import "../styles/Global.css";
import "../styles/OrderLabel.css";
import { useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { BsArrowUp } from "react-icons/bs";
import { DefaultField } from "../components/Field";
import AlertMessage from "../components/AlertMessage";
import Button from "../components/Button";
import Checkbox from "../components/Checkbox";
import axios from "../api/axios";
import Log from "../components/Log";
import mockData from "../content/mockOrderData";
import { isDevelopmentEnv } from "../utils/Helpers";
import { setSenderInfo } from "../redux/actions/UserAction";

export default function OrderLabel() {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const isLoggedIn = useSelector((state) => state.user.isLoggedIn);
  const email = useSelector((state) => state.user.email);
  const savedSenderInfo = useSelector((state) => state.user.senderInfo);

  const senderAndRecipientInfo = {
    firstName: "",
    lastName: "",
    companyName: "",
    phone: "",
    street: "",
    suite: "",
    city: "",
    state: "",
    zip: "",
    country: "",
  };
  const [formValues, setFormValues] = useState({
    courier: "",
    classType: "",
    packageInfo: {
      weight: "",
      length: "",
      width: "",
      height: "",
      description: "",
      referenceNumber: "",
    },
    senderInfo: { ...senderAndRecipientInfo, ...savedSenderInfo },
    recipientInfo: { ...senderAndRecipientInfo },
  });
  const [sectionErrors, setSectionErrors] = useState({});
  const [successMsg, setSuccessMsg] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showFloatingBtn, setShowFloatingBtn] = useState(false);
  const [senderInfoChecked, setSenderInfoChecked] = useState(!!savedSenderInfo);

  useEffect(() => {
    if (!isLoggedIn) navigate("/");
  }, [isLoggedIn, navigate]);

  useEffect(() => {
    const scrollHandler = () => setShowFloatingBtn(window.scrollY > 100);
    window.addEventListener("scroll", scrollHandler);
    return () => window.removeEventListener("scroll", scrollHandler);
  }, []);

  // Save input value on change
  const saveInput = (e, section = "") => {
    e.preventDefault();

    // Clear error message if user starts typing
    const errorCopy = { ...sectionErrors };
    if (section === "packageInfo") delete errorCopy["package"];
    else if (section === "recipientInfo") delete errorCopy["recipient"];
    else if (section === "senderInfo") delete errorCopy["sender"];
    setSectionErrors(errorCopy);

    setFormValues((prevValues) => {
      if (section) {
        return {
          ...prevValues,
          [section]: {
            ...prevValues[section],
            [e.target.name]: e.target.value.trim(),
          },
        };
      }
      return {
        ...prevValues,
        [section]: e.target.value.trim(),
      };
    });

    // Update sender info in redux store if user checks the checkbox
    if (senderInfoChecked && section === "senderInfo") {
      dispatch(
        setSenderInfo({
          ...savedSenderInfo,
          [e.target.name]: e.target.value.trim(),
        })
      );
    }
  };

  const isSectionEmpty = (section) => {
    return Object.values(section).some((value) => value === "");
  };

  const submit = (e) => {
    e.preventDefault();
    setLoading(true);
    const { courier, classType, packageInfo, senderInfo, recipientInfo } =
      formValues;
    const sections = {
      package: packageInfo,
      sender: senderInfo,
      recipient: recipientInfo,
    };
    const errors = {};

    // if (courier === "" || classType === "") {
    //   errors.package = "Please select a courier and a class type.";
    // }

    Object.keys(sections).forEach((sectionName) => {
      if (isSectionEmpty(sections[sectionName])) {
        errors[sectionName] =
          "Please fill out all mandatory fields in this section.";
      }
    });

    if (errors) {
      setLoading(false);
      setSectionErrors(errors);
      return;
    }

    // TODO: @Kian axios call here, also SAVE SENDER INFO as a Object to user in DB
    axios
      .post("/OrderLabel", { email: email, withCredentials: true })
      .then((res) => {
        if (res.data.errMsg) {
          setSectionErrors({ container: res.data.errMsg });
        } else {
          setSectionErrors({});
          setSuccessMsg("Your order has been placed. Redirecting...");
          setTimeout(() => {
            navigate("/order-success");
          }, 3000);
        }
      })
      .catch((e) => {
        Log("Error: ", e);
        setSectionErrors({
          container: "An unexpected error occured. Please try again later.",
        }); // Axios default error
      })
      .finally(() => {
        setLoading(false);
      });
  };

  return (
    <PageLayout
      title="Order Label"
      description="Order Shipping Labels Online - Quickly generate shipping labels by providing address and package details. Get your label sent to your email for easy printing and shipping. Streamline your shipping process with KEMLabels."
    >
      <div className="globalContainer orderLabelContainer">
        <div className="headingContainer">
          <h1>Order label</h1>
          <p>
            Please complete all mandatory fields to proceed with placing your
            order.
          </p>
          {sectionErrors?.container && (
            <AlertMessage msg={sectionErrors.container} type="error" />
          )}
          {successMsg && <AlertMessage msg={successMsg} type="success" />}
        </div>
        <form action="POST" className="orderLabelForm">
          <div id="packageSection" className="formSection">
            <div className="sectionHeader">
              <h2>Package details</h2>
            </div>
            {sectionErrors?.package && (
              <AlertMessage
                msg={sectionErrors.package}
                type="error"
                divId="packageSection"
              />
            )}
            <div className="formRow">
              <DefaultField
                label="Weight"
                helpText="Maximum weight is 150 lbs."
                onChangeEvent={(e) => saveInput(e, "packageInfo")}
                minLength={1}
                maxLength={3}
                name="weight"
                currentValue={formValues?.packageInfo?.weight}
                postfix="lbs"
                shortField
              />
              <DefaultField
                label="Length"
                onChangeEvent={(e) => saveInput(e, "packageInfo")}
                minLength={1}
                maxLength={3}
                name="length"
                currentValue={formValues?.packageInfo?.length}
                postfix="in"
                shortField
                fixTextAlignment
              />
            </div>
            <div className="formRow">
              <DefaultField
                label="Width"
                onChangeEvent={(e) => saveInput(e, "packageInfo")}
                minLength={1}
                maxLength={3}
                name="width"
                currentValue={formValues?.packageInfo?.width}
                postfix="in"
                shortField
              />
              <DefaultField
                label="Height"
                onChangeEvent={(e) => saveInput(e, "packageInfo")}
                minLength={1}
                maxLength={3}
                name="height"
                currentValue={formValues?.packageInfo?.height}
                postfix="in"
                shortField
              />
            </div>
            <div className="formRow">
              <DefaultField
                label="Reference number"
                helpText="Can be your invoice number found on your order details."
                onChangeEvent={(e) => saveInput(e, "packageInfo")}
                minLength={1}
                maxLength={20}
                name="referenceNumber"
                currentValue={formValues?.packageInfo?.referenceNumber}
                optional
              />
            </div>
            <div className="formRow">
              <DefaultField
                fieldType="textarea"
                label="Description"
                helpText="Any relavent package information."
                onChangeEvent={(e) => saveInput(e, "packageInfo")}
                minLength={1}
                maxLength={100}
                name="description"
                currentValue={formValues?.packageInfo?.description}
                optional
              />
            </div>
          </div>
          <div id="senderSection" className="formSection">
            <div className="sectionHeader">
              <h2>Sender address</h2>
              <Checkbox
                label="Save"
                isSelected={senderInfoChecked}
                onCheckboxChange={() => {
                  setSenderInfoChecked(!senderInfoChecked);
                  dispatch(
                    setSenderInfo(
                      senderInfoChecked ? null : formValues.senderInfo
                    )
                  );
                }}
              />
            </div>
            {sectionErrors?.sender && (
              <AlertMessage
                msg={sectionErrors.sender}
                type="error"
                divId="senderSection"
              />
            )}
            <div className="formRow">
              <DefaultField
                label="First name"
                onChangeEvent={(e) => saveInput(e, "senderInfo")}
                placeholder="John"
                minLength={1}
                maxLength={50}
                name="firstName"
                currentValue={formValues?.senderInfo?.firstName}
              />
              <DefaultField
                label="Last name"
                onChangeEvent={(e) => saveInput(e, "senderInfo")}
                placeholder="Doe"
                minLength={1}
                maxLength={50}
                name="lastName"
                currentValue={formValues?.senderInfo?.lastName}
              />
            </div>
            <div className="formRow">
              <DefaultField
                label="Company name"
                onChangeEvent={(e) => saveInput(e, "senderInfo")}
                maxLength={50}
                name="companyName"
                currentValue={formValues?.senderInfo?.companyName}
                fixTextAlignment
                optional
              />
              <DefaultField
                label="Phone number"
                helpText="(XXX) XXX-XXXX."
                onChangeEvent={(e) => saveInput(e, "senderInfo")}
                placeholder="(XXX) XXX-XXXX"
                minLength={10}
                maxLength={10}
                name="phone"
                currentValue={formValues?.senderInfo?.phone}
              />
            </div>
            <div className="formRow">
              <DefaultField
                label="Street"
                onChangeEvent={(e) => saveInput(e, "senderInfo")}
                placeholder="Start typing your address..."
                minLength={1}
                maxLength={50}
                name="street"
                currentValue={formValues?.senderInfo?.street}
              />
              <DefaultField
                label="Suite / Apt / Unit"
                onChangeEvent={(e) => saveInput(e, "senderInfo")}
                minLength={1}
                maxLength={15}
                name="suite"
                currentValue={formValues?.senderInfo?.suite}
                shortField
                optional
              />
            </div>
            <div className="formRow">
              <DefaultField
                label="City"
                onChangeEvent={(e) => saveInput(e, "senderInfo")}
                placeholder="Vancouver"
                minLength={1}
                maxLength={50}
                name="city"
                currentValue={formValues?.senderInfo?.city}
              />
              <DefaultField
                label="Zip / Postal code"
                onChangeEvent={(e) => saveInput(e, "senderInfo")}
                minLength={6}
                maxLength={6}
                name="zip"
                currentValue={formValues?.senderInfo?.zip}
                shortField
              />
            </div>
            <div className="formRow">
              <DefaultField
                label="Province / State"
                onChangeEvent={(e) => saveInput(e, "senderInfo")}
                placeholder="British Columbia"
                minLength={1}
                maxLength={50}
                name="state"
                currentValue={formValues?.senderInfo?.state}
              />
              <DefaultField
                label="Country"
                onChangeEvent={(e) => saveInput(e, "senderInfo")}
                placeholder="Canada"
                minLength={1}
                maxLength={50}
                name="country"
                currentValue={formValues?.senderInfo?.country}
              />
            </div>
          </div>
          <div id="recipientSection" className="formSection">
            <div className="sectionHeader">
              <h2>Recipient address</h2>
            </div>
            {sectionErrors?.recipient && (
              <AlertMessage
                msg={sectionErrors.recipient}
                type="error"
                divId="recipientSection"
              />
            )}
            <div className="formRow">
              <DefaultField
                label="First name"
                onChangeEvent={(e) => saveInput(e, "recipientInfo")}
                placeholder="John"
                minLength={1}
                maxLength={50}
                name="firstName"
                currentValue={formValues?.recipientInfo?.firstName}
              />
              <DefaultField
                label="Last name"
                onChangeEvent={(e) => saveInput(e, "recipientInfo")}
                placeholder="Doe"
                minLength={1}
                maxLength={50}
                name="lastName"
                currentValue={formValues?.recipientInfo?.lastName}
              />
            </div>
            <div className="formRow">
              <DefaultField
                label="Company name"
                onChangeEvent={(e) => saveInput(e, "recipientInfo")}
                maxLength={50}
                name="companyName"
                currentValue={formValues?.recipientInfo?.companyName}
                fixTextAlignment
                optional
              />
              <DefaultField
                label="Phone number"
                helpText="(XXX) XXX-XXXX."
                onChangeEvent={(e) => saveInput(e, "recipientInfo")}
                placeholder="(XXX) XXX-XXXX"
                minLength={10}
                maxLength={10}
                name="phone"
                currentValue={formValues?.recipientInfo?.phone}
              />
            </div>
            <div className="formRow">
              <DefaultField
                label="Street"
                onChangeEvent={(e) => saveInput(e, "recipientInfo")}
                placeholder="Start typing your address..."
                minLength={1}
                maxLength={50}
                name="street"
                currentValue={formValues?.recipientInfo?.street}
              />
              <DefaultField
                label="Suite / Apt / Unit"
                onChangeEvent={(e) => saveInput(e, "recipientInfo")}
                minLength={1}
                maxLength={15}
                name="suite"
                currentValue={formValues?.recipientInfo?.suite}
                shortField
                optional
              />
            </div>
            <div className="formRow">
              <DefaultField
                label="City"
                onChangeEvent={(e) => saveInput(e, "recipientInfo")}
                placeholder="Vancouver"
                minLength={1}
                maxLength={50}
                name="city"
                currentValue={formValues?.recipientInfo?.city}
              />
              <DefaultField
                label="Zip / Postal code"
                onChangeEvent={(e) => saveInput(e, "recipientInfo")}
                minLength={6}
                maxLength={6}
                name="zip"
                currentValue={formValues?.recipientInfo?.zip}
                shortField
              />
            </div>
            <div className="formRow">
              <DefaultField
                label="Province / State"
                onChangeEvent={(e) => saveInput(e, "recipientInfo")}
                placeholder="British Columbia"
                minLength={1}
                maxLength={50}
                name="state"
                currentValue={formValues?.recipientInfo?.state}
              />
              <DefaultField
                label="Country"
                onChangeEvent={(e) => saveInput(e, "recipientInfo")}
                placeholder="Canada"
                minLength={1}
                maxLength={50}
                name="country"
                currentValue={formValues?.recipientInfo?.country}
              />
            </div>
          </div>
          <div className="btnContainer">
            <Button
              btnType="submit"
              loading={loading}
              onClickEvent={submit}
              text="Submit order"
            />
            {isDevelopmentEnv() && (
              <Button
                fill="outline"
                text="Autofill"
                onClickEvent={() => setFormValues(mockData)}
              />
            )}
          </div>
        </form>
        <div>
          <Button
            className={`floatingBtn ${showFloatingBtn ? "" : "hidden"}`}
            title="Scroll to top"
            onClickEvent={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            children={<BsArrowUp size={24} />}
          />
        </div>
      </div>
    </PageLayout>
  );
}
