import React from "react";
import { useDispatch, useSelector } from "react-redux";
import AlertMessage from "./AlertMessage";
import { DefaultField, DropdownField, PhoneField } from "./Field";
import Checkbox from "./Checkbox";
import Button from "./Button";
import { isDevelopmentEnv } from "../utils/Helpers";
import { classTypes, courierTypes } from "../content/orderLabelsConstants";
import { setSenderInfo } from "../redux/actions/UserAction";
import mockData from "../content/mockOrderData";
import Log from "./Log";
import {
  validatePackageHeight,
  validatePackageLength,
  validatePackageWeight,
  validatePackageWidth,
  validatePhoneNumber,
} from "../utils/Validation";

export default function OrderForm({
  pricing,
  initialFormValues,
  sectionErrors,
  setSectionErrors,
  formValues,
  setFormValues,
  saveSenderInfo, // True if user wants to save sender info
  setSaveSenderInfo, // Function to toggle saveSenderInfo
  totalPrice,
  setTotalPrice,
  signatureChecked,
  setSignatureChecked,
  fieldErrors,
  setFieldErrors,
  setShowOrderConfirmPopup,
}) {
  const dispatch = useDispatch();

  const senderInfoRedux = useSelector((state) => state.user.senderInfo);
  const creditAmount = useSelector((state) => state.user.creditAmount);
  const optionalFields = [
    "referenceNumber",
    "referenceNumber2",
    "description",
    "suite",
  ];

  // Save input value on change
  const saveInput = (e, section, singleValue = false) => {
    if (!singleValue && e.preventDefault) e.preventDefault();

    // Clear error message if user starts typing
    const errorCopy = { ...sectionErrors };
    if (section === "packageInfo") delete errorCopy["package"];
    else if (section === "recipientInfo") delete errorCopy["recipient"];
    else if (section === "senderInfo") delete errorCopy["sender"];
    else if (section === "courier" || section === "classType") {
      delete errorCopy["courierClass"];
    }
    setSectionErrors(errorCopy);

    const numericalFields = ["weight", "length", "width", "height"];
    setFormValues((prevValues) => {
      if (!singleValue) {
        const value = numericalFields.includes(e.target.name)
          ? Number(e.target.value)
          : e.target.value;
        return {
          ...prevValues,
          [section]: {
            ...prevValues[section],
            [e.target.name]: value,
          },
        };
      }
      return {
        ...prevValues,
        [section]: e,
      };
    });

    // Update sender info in redux store if user checks the checkbox
    if (saveSenderInfo && section === "senderInfo") {
      dispatch(
        setSenderInfo({
          ...senderInfoRedux,
          [e.target.name]: e.target.value.trim(),
        })
      );
    }
  };

  function calculatePrice(courier, classType, isSignatureChecked) {
    const price = pricing[courier][classType] || 0;
    return isSignatureChecked ? price + 1 : price;
  }

  function validatePackage(packageInfo) {
    const packageWeightvalid = validatePackageWeight(
      packageInfo.weight,
      setFieldErrors
    );
    const packageLengthValid = validatePackageLength(
      packageInfo.length,
      setFieldErrors
    );
    const packageWidthValid = validatePackageWidth(
      packageInfo.width,
      setFieldErrors
    );
    const packageHeightValid = validatePackageHeight(
      packageInfo.height,
      setFieldErrors
    );
    return (
      !packageWeightvalid ||
      !packageLengthValid ||
      !packageWidthValid ||
      !packageHeightValid
    );
  }

  function validatePhone(phone, fieldName) {
    return !validatePhoneNumber(phone, setFieldErrors, fieldName);
  }

  const isSectionEmpty = (section) => {
    let isFieldEmpty = false;
    Object.keys(section).forEach((field) => {
      if (section[field] === "" && !optionalFields.includes(field)) {
        Log(`Missing field: ${field}`);
        isFieldEmpty = true;
      }
    });
    return isFieldEmpty;
  };

  const validateForm = (e) => {
    e.preventDefault();
    setFieldErrors({}); // Clear any previous errors

    // Check if user has enough credits, if not, display error message
    if (creditAmount === 0 || creditAmount - totalPrice < 0) {
      setSectionErrors({
        container:
          "You have insufficient funds to purchase. Please load your credits first to proceed with your purchase.",
      });
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    const { courier, classType, packageInfo, senderInfo, recipientInfo } =
      formValues;
    const sections = {
      package: packageInfo,
      sender: senderInfo,
      recipient: recipientInfo,
    };
    const errors = {};

    if (!courier || !classType) {
      errors.courierClass = "Please select a courier and a class type.";
      if (!courier) Log("Missing field: courier");
      if (!classType) Log("Missing field: classType");
    }

    Object.keys(sections).forEach((sectionName) => {
      if (isSectionEmpty(sections[sectionName])) {
        errors[sectionName] =
          "Please fill out all mandatory fields in this section.";
      }
    });

    // Additional validation when all fields are filled in
    if (Object.keys(errors).length === 0) {
      if (validatePackage(packageInfo)) {
        errors.package =
          "Please review your package details and ensure that all fields are entered correctly.";
      }
      if (validatePhone(senderInfo.phone, "senderPhone")) {
        errors.sender =
          "Please review your phone number and ensure that it is entered correctly.";
      }
      if (validatePhone(recipientInfo.phone, "recipientPhone")) {
        errors.recipient =
          "Please review your phone number and ensure that it is entered correctly.";
      }
    }

    // If there are errors, display them and return
    if (Object.keys(errors).length > 0) {
      setSectionErrors(errors);
      return;
    }

    // Show confirmation popup
    document.body.style.overflow = "hidden";
    setShowOrderConfirmPopup(true);
  };

  return (
    <form action="POST" className="orderLabelForm">
      <div id="courierClassSection" className="formSection">
        <div className="sectionHeader">
          <h2>Courier and class</h2>
        </div>
        {sectionErrors?.courierClass && (
          <AlertMessage
            msg={sectionErrors.courierClass}
            type="error"
            divId="courierClassSection"
          />
        )}
        <div className="formRow">
          <DropdownField
            label="Courier Type"
            fullwidth
            dropdownItemOptions={courierTypes}
            onChangeEvent={(e) => {
              const courier = e.label.toString();
              saveInput(courier, "courier", true);
              if (courier !== formValues.courier) {
                saveInput("", "classType", true); // Clear class type if courier changes
                setTotalPrice(0);
              }
              const country = courier === "UPS CA" ? "CANADA" : "USA";
              setFormValues((prevValues) => {
                return {
                  ...prevValues,
                  senderInfo: {
                    ...prevValues.senderInfo,
                    country: country,
                  },
                  recipientInfo: {
                    ...prevValues.recipientInfo,
                    country: country,
                  },
                };
              });
            }}
            value={formValues?.courier}
          />
          <DropdownField
            label="Class Type"
            fullwidth
            dropdownItemOptions={classTypes[formValues.courier] || []}
            onChangeEvent={(e) => {
              saveInput(e.label.toString(), "classType", true);
              setTotalPrice(
                calculatePrice(formValues.courier, e.label, signatureChecked)
              );
            }}
            value={formValues?.classType}
          />
        </div>
        {totalPrice > 0 && (
          <div className="formRow">
            <Checkbox
              label="Signature (+ $1.00 USD)"
              isSelected={signatureChecked}
              onCheckboxChange={() => {
                const { courier, classType } = formValues;
                setSignatureChecked((prevChecked) => {
                  const updatedChecked = !prevChecked;
                  setTotalPrice(
                    calculatePrice(courier, classType, updatedChecked)
                  );
                  return updatedChecked;
                });
              }}
              customStyle={{ marginBottom: "1.5rem" }}
            />
          </div>
        )}
      </div>

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
            helpText="Whole numbers only, no decimals."
            onChangeEvent={(e) => {
              e.target.value = e.target.value.replace(/\D/g, "").slice(0, 2);
              if (fieldErrors?.packageWeight) {
                setFieldErrors((prevErrors) => {
                  delete prevErrors.packageWeight;
                  return { ...prevErrors };
                });
              }
              saveInput(e, "packageInfo");
            }}
            minLength={1}
            maxLength={2}
            name="weight"
            currentValue={formValues?.packageInfo?.weight}
            postfix="lbs"
            error={fieldErrors?.packageWeight}
            shortField
          />
          <DefaultField
            label="Length"
            helpText="Whole numbers only, no decimals."
            onChangeEvent={(e) => {
              e.target.value = e.target.value.replace(/\D/g, "").slice(0, 2);
              if (fieldErrors?.packageLength) {
                setFieldErrors((prevErrors) => {
                  delete prevErrors.packageLength;
                  return { ...prevErrors };
                });
              }
              saveInput(e, "packageInfo");
            }}
            minLength={1}
            maxLength={2}
            name="length"
            currentValue={formValues?.packageInfo?.length}
            postfix="in"
            error={fieldErrors?.packageLength}
            shortField
          />
        </div>
        <div className="formRow">
          <DefaultField
            label="Width"
            helpText="Whole numbers only, no decimals."
            onChangeEvent={(e) => {
              e.target.value = e.target.value.replace(/\D/g, "").slice(0, 2);
              if (fieldErrors?.packageWidth) {
                setFieldErrors((prevErrors) => {
                  delete prevErrors.packageWidth;
                  return { ...prevErrors };
                });
              }
              saveInput(e, "packageInfo");
            }}
            minLength={1}
            maxLength={2}
            name="width"
            currentValue={formValues?.packageInfo?.width}
            postfix="in"
            error={fieldErrors?.packageWidth}
            shortField
          />
          <DefaultField
            label="Height"
            helpText="Whole numbers only, no decimals."
            onChangeEvent={(e) => {
              e.target.value = e.target.value.replace(/\D/g, "").slice(0, 2);
              if (fieldErrors?.packageHeight) {
                setFieldErrors((prevErrors) => {
                  delete prevErrors.packageHeight;
                  return { ...prevErrors };
                });
              }
              saveInput(e, "packageInfo");
            }}
            minLength={1}
            maxLength={2}
            name="height"
            currentValue={formValues?.packageInfo?.height}
            postfix="in"
            error={fieldErrors?.packageHeight}
            shortField
          />
        </div>
        <div className="formRow">
          <DefaultField
            label="Reference number 1"
            helpText="Order numbers or invoice numbers."
            onChangeEvent={(e) => saveInput(e, "packageInfo")}
            minLength={1}
            maxLength={50}
            name="referenceNumber"
            currentValue={formValues?.packageInfo?.referenceNumber}
            optional
          />
        </div>
        <div className="formRow">
          <DefaultField
            label="Reference number 2"
            helpText="Order numbers or invoice numbers."
            onChangeEvent={(e) => saveInput(e, "packageInfo")}
            minLength={1}
            maxLength={50}
            name="referenceNumber2"
            currentValue={formValues?.packageInfo?.referenceNumber2}
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
            isSelected={saveSenderInfo}
            onCheckboxChange={() => {
              setSaveSenderInfo(!saveSenderInfo);
              dispatch(
                setSenderInfo(saveSenderInfo ? null : formValues.senderInfo)
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
            minLength={1}
            maxLength={50}
            name="firstName"
            currentValue={formValues?.senderInfo?.firstName}
          />
          <DefaultField
            label="Last name"
            onChangeEvent={(e) => saveInput(e, "senderInfo")}
            minLength={1}
            maxLength={50}
            name="lastName"
            currentValue={formValues?.senderInfo?.lastName}
          />
        </div>
        <div className="formRow">
          <PhoneField
            label="Phone number"
            fieldType="tel"
            helpText="(XXX) XXX-XXXX"
            onChangeEvent={(e) => {
              saveInput(e, "senderInfo");
              if (fieldErrors?.senderPhone) {
                setFieldErrors((prevErrors) => {
                  delete prevErrors.senderPhone;
                  return { ...prevErrors };
                });
              }
            }}
            minLength={10}
            maxLength={10}
            name="phone"
            currentValue={formValues?.senderInfo?.phone}
            error={fieldErrors?.senderPhone}
            halfWidth
          />
        </div>
        <div className="formRow">
          <DefaultField
            label="Street"
            onChangeEvent={(e) => saveInput(e, "senderInfo")}
            minLength={1}
            maxLength={50}
            name="street"
            currentValue={formValues?.senderInfo?.street}
          />
          <DefaultField
            label="Suite / Apt / Unit"
            onChangeEvent={(e) => saveInput(e, "senderInfo")}
            minLength={1}
            maxLength={10}
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
            placeholder="Los Angeles"
            minLength={1}
            maxLength={50}
            name="city"
            currentValue={formValues?.senderInfo?.city}
          />
          <DefaultField
            label="Zip / Postal code"
            onChangeEvent={(e) => saveInput(e, "senderInfo")}
            minLength={6}
            maxLength={10}
            name="zip"
            currentValue={formValues?.senderInfo?.zip}
            shortField
          />
        </div>
        <div className="formRow">
          <DefaultField
            label="Province / State"
            helpText="Province code abbreviations (CA for California)"
            onChangeEvent={(e) => saveInput(e, "senderInfo")}
            placeholder="CA"
            minLength={1}
            maxLength={2}
            name="state"
            currentValue={formValues?.senderInfo?.state}
          />
          <DefaultField
            label="Country"
            minLength={1}
            maxLength={50}
            name="country"
            currentValue={formValues?.senderInfo?.country}
            fixTextAlignment
            disabled
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
            minLength={1}
            maxLength={50}
            name="firstName"
            currentValue={formValues?.recipientInfo?.firstName}
          />
          <DefaultField
            label="Last name"
            onChangeEvent={(e) => saveInput(e, "recipientInfo")}
            minLength={1}
            maxLength={50}
            name="lastName"
            currentValue={formValues?.recipientInfo?.lastName}
          />
        </div>
        <div className="formRow">
          <PhoneField
            label="Phone number"
            fieldType="tel"
            helpText="(XXX) XXX-XXXX"
            onChangeEvent={(e) => {
              saveInput(e, "recipientInfo");
              if (fieldErrors?.recipientPhone) {
                setFieldErrors((prevErrors) => {
                  delete prevErrors.recipientPhone;
                  return { ...prevErrors };
                });
              }
            }}
            minLength={10}
            maxLength={10}
            name="phone"
            currentValue={formValues?.recipientInfo?.phone}
            error={fieldErrors?.recipientPhone}
            halfWidth
          />
        </div>
        <div className="formRow">
          <DefaultField
            label="Street"
            onChangeEvent={(e) => saveInput(e, "recipientInfo")}
            minLength={1}
            maxLength={50}
            name="street"
            currentValue={formValues?.recipientInfo?.street}
          />
          <DefaultField
            label="Suite / Apt / Unit"
            onChangeEvent={(e) => saveInput(e, "recipientInfo")}
            minLength={1}
            maxLength={10}
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
            placeholder="Los Angeles"
            minLength={1}
            maxLength={50}
            name="city"
            currentValue={formValues?.recipientInfo?.city}
          />
          <DefaultField
            label="Zip / Postal code"
            onChangeEvent={(e) => saveInput(e, "recipientInfo")}
            minLength={6}
            maxLength={10}
            name="zip"
            currentValue={formValues?.recipientInfo?.zip}
            shortField
          />
        </div>
        <div className="formRow">
          <DefaultField
            label="Province / State"
            helpText="Province code abbreviations (CA for California)"
            onChangeEvent={(e) => saveInput(e, "recipientInfo")}
            placeholder="CA"
            minLength={1}
            maxLength={2}
            name="state"
            currentValue={formValues?.recipientInfo?.state}
          />
          <DefaultField
            label="Country"
            minLength={1}
            maxLength={50}
            name="country"
            currentValue={formValues?.recipientInfo?.country}
            fixTextAlignment
            disabled
          />
        </div>
      </div>
      <div className="orderFooter">
        <div className="orderTotal">
          <p>
            Order Total: <strong>${totalPrice.toFixed(2)}</strong>
          </p>
        </div>
        <div className="btnContainer">
          {isDevelopmentEnv() && (
            <Button
              fill="outline"
              text="Autofill"
              onClickEvent={() => {
                setFormValues(mockData);
                setTotalPrice(
                  calculatePrice(
                    mockData.courier,
                    mockData.classType,
                    signatureChecked
                  )
                );
              }}
            />
          )}
          <Button
            fill="outline"
            onClickEvent={() => setFormValues(initialFormValues)}
            text="Clear form"
          />
          <Button
            btnType="submit"
            onClickEvent={validateForm}
            text="Submit order"
          />
        </div>
      </div>
    </form>
  );
}
