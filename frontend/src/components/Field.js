import React, { useState } from "react";
import "../styles/Global.css";
import { FaEye, FaEyeSlash } from "react-icons/fa";

function InputField({
  id,
  className = "",
  containerClassName = "",
  name = "",
  fieldType = "text",
  title = "",
  initialValue,
  currentValue,
  placeholder = "",
  minLength,
  maxLength,
  onChangeEvent,
  customStyle,
  disabled = false,
}) {
  return (
    <div className={`fieldContainer ${containerClassName}`}>
      <input
        id={id}
        className={`fieldInput ${className} ${disabled ? "disabled" : ""}`}
        type={fieldType}
        name={name}
        title={title}
        style={{ ...customStyle }}
        defaultValue={initialValue}
        value={currentValue}
        placeholder={placeholder}
        disabled={disabled}
        minLength={minLength || null}
        maxLength={maxLength || null}
        onChange={(e) => {
          if (onChangeEvent) onChangeEvent(e);
        }}
      />
    </div>
  );
}

function StripeInputField({
  id,
  className = "",
  containerClassName = "",
  name = "",
  fieldType = "text",
  title = "",
  initialValue,
  currentValue,
  label = "",
  placeholder = "",
  minLength,
  maxLength,
  onChangeEvent,
  customStyle,
  disabled = false,
}) {
  return (
    <div className={`stripeFieldContainer ${containerClassName}`}>
      <label className="stripeFieldLabel">{label}</label>
      <input
        id={id}
        className={`stripeFieldInput ${className} ${
          disabled ? "disabled" : ""
        }`}
        type={fieldType}
        name={name}
        title={title}
        style={{ ...customStyle }}
        defaultValue={initialValue}
        value={currentValue}
        placeholder={placeholder}
        disabled={disabled}
        minLength={minLength || null}
        maxLength={maxLength || null}
        onChange={(e) => {
          if (onChangeEvent) onChangeEvent(e);
        }}
      />
    </div>
  );
}

function StripeAmountField({
  id,
  className = "",
  containerClassName = "",
  name = "",
  fieldType = "number",
  title = "",
  initialValue,
  currentValue,
  label = "",
  placeholder = "",
  prefix = "",
  postfix = "",
  onChangeEvent,
  customStyle,
  disabled = false,
}) {
  return (
    <div className={`stripeFieldContainer ${containerClassName}`}>
      <label className="stripeFieldLabel">{label}</label>
      <div style={{ display: "flex" }}>
        {prefix && <span className="stripePrefix">{prefix}</span>}
        <input
          id={id}
          className={`stripeFieldInput ${className} 
            ${disabled ? "disabled" : ""} ${prefix ? "prefix" : ""} 
            ${postfix ? "postfix" : ""}`}
          type={fieldType}
          name={name}
          title={title}
          style={{
            ...customStyle,
          }}
          defaultValue={initialValue}
          value={currentValue}
          placeholder={placeholder}
          disabled={disabled}
          step={0.1}
          onBlur={() => {
            let inputValue = currentValue;
            if (!inputValue.includes(".")) {
              inputValue = parseFloat(inputValue).toFixed(2);
            } else {
              // If there's a decimal point, check the number of decimal places
              const [integerPart, decimalPart] = inputValue.split(".");
              if (decimalPart.length < 2) {
                inputValue = `${integerPart}.${decimalPart.padEnd(2, "0")}`;
              }
            }
            onChangeEvent({ target: { value: inputValue } });
          }}
          onChange={(e) => {
            if (onChangeEvent) {
              let inputValue = e.target.value.replace(/[^0-9.]/g, "");
              let [integerPart, decimalPart] = inputValue.split(".");

              // Limit to 6 digits before decimal
              if (integerPart && integerPart.length > 6) {
                integerPart = integerPart.slice(0, 6);
              }

              // Limit to 2 decimal places
              if (decimalPart && decimalPart.length > 2) {
                decimalPart = decimalPart.slice(0, 2);
              }

              // Combine integer and decimal parts
              inputValue = decimalPart
                ? `${integerPart}.${decimalPart}`
                : integerPart;
              onChangeEvent({ target: { value: inputValue } });
            }
          }}
        />
        {postfix && <span className="stripePostfix">{postfix}</span>}
      </div>
    </div>
  );
}

function PasswordField({
  id,
  className = "",
  containerClassName = "",
  name = "",
  initialValue,
  currentValue,
  placeholder = "",
  minLength,
  maxLength,
  onChangeEvent,
  customStyle,
  disabled = false,
}) {
  const [showPassword, setShowPassword] = useState(false);
  return (
    <div className={`fieldContainer ${containerClassName}`}>
      <input
        id={id}
        className={`fieldInput ${className} ${disabled ? "disabled" : ""}`}
        type={showPassword ? "text" : "password"}
        name={name}
        title="Minimum 8 characters"
        style={{ ...customStyle }}
        defaultValue={initialValue}
        value={currentValue}
        placeholder={placeholder}
        disabled={disabled}
        minLength={minLength || null}
        maxLength={maxLength || null}
        onChange={(e) => {
          if (onChangeEvent) onChangeEvent(e);
        }}
      />
      <div
        className="passwordIcon"
        title={showPassword ? "Hide password" : "Show password"}
        onClick={() => {
          setShowPassword(!showPassword);
        }}
      >
        {showPassword ? <FaEyeSlash /> : <FaEye />}
      </div>
    </div>
  );
}

export { InputField, PasswordField, StripeAmountField, StripeInputField };
