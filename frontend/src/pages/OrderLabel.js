import React, { useEffect, useState } from "react";
import PageLayout from "../components/PageLayout";
import "../styles/Global.css";
import "../styles/OrderLabel.css";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { InputField } from "../components/Field";
import AlertMessage from "../components/AlertMessage";
import Button from "../components/Button";

export default function OrderLabel() {
  const navigate = useNavigate();

  const isLoggedIn = useSelector((state) => state.auth.isLoggedIn);

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
      weight: 0,
      length: 0,
      width: 0,
      height: 0,
      description: "",
      referneceNumber: "",
    },
    senderInfo: { ...senderAndRecipientInfo },
    recipientInfo: { ...senderAndRecipientInfo },
  });
  const [error, setError] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isLoggedIn) navigate("/");
  }, [isLoggedIn, navigate]);

  // Save input value on change
  const saveInput = (e, section = "", field = "") => {
    e.preventDefault();
    if (section === "senderInfo") {
      setError((array) => array.filter((e) => e.label !== "sender"));
    } else if (section === "recipientInfo") {
      setError((array) => array.filter((e) => e.label !== "recipient"));
    }
    setFormValues((prevValues) => {
      if (section) {
        return {
          ...prevValues,
          [section]: {
            ...prevValues[section],
            [field]: e.target.value.trim(),
          },
        };
      }
      return {
        ...prevValues,
        [section]: e.target.value.trim(),
      };
    });
  };

  const isSectionEmpty = (section) => {
    return Object.values(section).some((value) => value === "");
  };

  const submit = (e) => {
    e.preventDefault();
    setLoading(true);
    const { courier, classType, packageInfo, senderInfo, recipientInfo } =
      formValues;
    const isSenderInfoEmpty = isSectionEmpty(senderInfo);
    const isRecipientInfoEmpty = isSectionEmpty(recipientInfo);
    const isPackageInfoEmpty = isSectionEmpty(packageInfo);
    const errors = [];

    // if (courier === "" || classType === "") {
    //   errors.push({
    //     label: "package",
    //     msg: "Please select a courier and a class type.",
    //   });
    // }

    if (isPackageInfoEmpty) {
      errors.push({
        label: "package",
        msg: "Please fill out all required fields in this section.",
      });
    }

    if (isSenderInfoEmpty) {
      errors.push({
        label: "sender",
        msg: "Please fill out all required fields in this section.",
      });
    }
    if (isRecipientInfoEmpty) {
      errors.push({
        label: "recipient",
        msg: "Please fill out all required fields in this section.",
      });
    }

    if (errors.length > 0) {
      setLoading(false);
      setError(errors);
      return;
    }

    // TODO: axios call here
  };

  return (
    <PageLayout title="Order a Label">
      <div className="globalContainer orderLabelContainer">
        <div className="headingContainer" style={{ textAlign: "center" }}>
          <h1>Order a label</h1>
          <p>
            Please complete all mandatory fields to proceed with placing your
            order.
          </p>
          {error
            .filter((error) => error.label === "container")
            .map((error, i) => (
              <AlertMessage key={i} msg={error.msg} type="error" />
            ))}
        </div>
        <form action="POST" className="orderLabelForm">
          {/* <h2>Shipping label information</h2> */}
          <div id="senderSection" className="formSection">
            <h2>Sender Address</h2>
            {error
              .filter((error) => error.label === "sender")
              .map((error, i) => (
                <AlertMessage key={i} msg={error.msg} type="error" />
              ))}
            <div className="formRow">
              <InputField
                label="First name"
                onChangeEvent={(e) => saveInput(e, "senderInfo", "firstName")}
                placeholder="John"
                minLength={1}
                maxLength={50}
              />
              <InputField
                label="Last name"
                onChangeEvent={(e) => saveInput(e, "senderInfo", "lastName")}
                placeholder="Doe"
                minLength={1}
                maxLength={50}
              />
            </div>
            <div className="formRow">
              <InputField
                label="Company name"
                onChangeEvent={(e) => saveInput(e, "senderInfo", "companyName")}
                maxLength={50}
                optional
              />
              <InputField
                label="Phone number"
                onChangeEvent={(e) => saveInput(e, "senderInfo", "phone")}
                placeholder="(XXX) XXX-XXXX"
                minLength={10}
                maxLength={10}
              />
            </div>
            <div className="formRow">
              <InputField
                label="Street"
                onChangeEvent={(e) => saveInput(e, "senderInfo", "street")}
                placeholder="Start typing your address..."
                minLength={1}
                maxLength={50}
              />
              <InputField
                label="Suite / Apt / Unit"
                onChangeEvent={(e) => saveInput(e, "senderInfo", "suite")}
                minLength={1}
                maxLength={15}
                shortField
                optional
              />
            </div>
            <div className="formRow">
              <InputField
                label="City"
                onChangeEvent={(e) => saveInput(e, "senderInfo", "city")}
                placeholder="Vancouver"
                minLength={1}
                maxLength={50}
              />
              <InputField
                label="Zip / Postal code"
                onChangeEvent={(e) => saveInput(e, "senderInfo", "zip")}
                placeholder="A1B 2C3"
                minLength={6}
                maxLength={6}
                shortField
              />
            </div>
            <div className="formRow">
              <InputField
                label="Province / State"
                onChangeEvent={(e) => saveInput(e, "senderInfo", "state")}
                placeholder="British Columbia"
                minLength={1}
                maxLength={50}
              />
              <InputField
                label="Country"
                onChangeEvent={(e) => saveInput(e, "senderInfo", "country")}
                placeholder="Canada"
                minLength={1}
                maxLength={50}
              />
            </div>
          </div>
          <div id="recipientSection" className="formSection">
            <h2>Recipient Address</h2>
            {error
              .filter((error) => error.label === "recipient")
              .map((error, i) => (
                <AlertMessage key={i} msg={error.msg} type="error" />
              ))}
            <div className="formRow">
              <InputField
                label="First name"
                onChangeEvent={(e) =>
                  saveInput(e, "recipientInfo", "firstName")
                }
                placeholder="John"
                minLength={1}
                maxLength={50}
              />
              <InputField
                label="Last name"
                onChangeEvent={(e) => saveInput(e, "recipientInfo", "lastName")}
                placeholder="Doe"
                minLength={1}
                maxLength={50}
              />
            </div>
            <div className="formRow">
              <InputField
                label="Company name"
                onChangeEvent={(e) =>
                  saveInput(e, "recipientInfo", "companyName")
                }
                maxLength={50}
                optional
              />
              <InputField
                label="Phone number"
                onChangeEvent={(e) => saveInput(e, "recipientInfo", "phone")}
                placeholder="(XXX) XXX-XXXX"
                minLength={10}
                maxLength={10}
              />
            </div>
            <div className="formRow">
              <InputField
                label="Street"
                onChangeEvent={(e) => saveInput(e, "recipientInfo", "street")}
                placeholder="Start typing your address..."
                minLength={1}
                maxLength={50}
              />
              <InputField
                label="Suite / Apt / Unit"
                onChangeEvent={(e) => saveInput(e, "recipientInfo", "suite")}
                minLength={1}
                maxLength={15}
                shortField
                optional
              />
            </div>
            <div className="formRow">
              <InputField
                label="City"
                onChangeEvent={(e) => saveInput(e, "recipientInfo", "city")}
                placeholder="Vancouver"
                minLength={1}
                maxLength={50}
              />
              <InputField
                label="Zip / Postal code"
                onChangeEvent={(e) => saveInput(e, "recipientInfo", "zip")}
                placeholder="A1B 2C3"
                minLength={6}
                maxLength={6}
                shortField
              />
            </div>
            <div className="formRow">
              <InputField
                label="Province / State"
                onChangeEvent={(e) => saveInput(e, "recipientInfo", "state")}
                placeholder="British Columbia"
                minLength={1}
                maxLength={50}
              />
              <InputField
                label="Country"
                onChangeEvent={(e) => saveInput(e, "recipientInfo", "country")}
                placeholder="Canada"
                minLength={1}
                maxLength={50}
              />
            </div>
          </div>
          <div>
            <Button
              btnType="submit"
              loading={loading}
              onClickEvent={submit}
              text="Submit order"
            />
          </div>
        </form>
      </div>
    </PageLayout>
  );
}