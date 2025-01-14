import { useEffect, useState } from "react";
import { IoCloudUploadOutline } from "react-icons/io5";
import axios from "../api/axios";
import Log from "./Log";
import Button from "./Button";
import AlertMessage from "./AlertMessage";
import { useDispatch, useSelector } from "react-redux";
import { setUserCreditAmount } from "../redux/actions/UserAction";
import BulkOrderSuccess from "./BulkOrderSuccess";
import OrderConfirmPopup from "./OrderConfirmPopup";

export default function BulkOrder({ setIsBulkOrder }) {
  const dispatch = useDispatch();

  const creditAmount = useSelector((state) => state.user.creditAmount);
  const email = useSelector((state) => state.user.email);

  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState(false);
  const [sectionErrors, setSectionErrors] = useState({});
  const [fieldErrors, setFieldErrors] = useState({});
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [showOrderConfirmPopup, setShowOrderConfirmPopup] = useState(false);

  const [isFileDragEnter, setIsFileDragEnter] = useState(false);
  const [bulkOrderFile, setBulkOrderFile] = useState(null);
  const [numOrders, setNumOrders] = useState(0);
  const [totalPrice, setTotalPrice] = useState(0);
  const [courier, setCourier] = useState("");
  const [classType, setClassType] = useState("");
  const [hasSignature, setHasSignature] = useState(false);

  useEffect(() => {
    if (creditAmount === 0) {
      setSectionErrors({
        container:
          "You have insufficient funds to purchase. Please load your credits first to proceed with your purchase.",
      });
    }
  }, [creditAmount]);

  function handleFileDragEnter(e) {
    e.preventDefault();
    e.stopPropagation();
    setIsFileDragEnter(true);
  }

  function handleFileDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    setIsFileDragEnter(false);
  }

  function handleFileDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    setIsFileDragEnter(true);
  }

  function handleFileDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    setFieldErrors({});
    setIsFileDragEnter(false);
    handleFileUpload(e.dataTransfer.files[0]);
  }

  function handleFileUpload(file) {
    setFieldErrors({});
    if (file.size > 2097152) {
      setFieldErrors((prev) => ({
        ...prev,
        bulkOrderFile: "File size exceeds 2MB. Please upload a smaller file.",
      }));
      return;
    }
    if (
      file.type !==
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    ) {
      setFieldErrors((prev) => ({
        ...prev,
        bulkOrderFile: "Invalid file format. Please upload a XLSX file.",
      }));
      return;
    }
    setBulkOrderFile(file);
  }

  function validateBulkOrder() {
    if (!bulkOrderFile) {
      setSectionErrors({ container: "Please select a file to upload." });
      return;
    }

    if (creditAmount === 0) {
      setSectionErrors({
        container:
          "You have insufficient funds to purchase. Please load your credits first to proceed with your purchase.",
      });
      return;
    }

    setShowOrderConfirmPopup(true);
  }

  function confirmOrder() {
    setLoading(true);
    const formData = new FormData();
    formData.append("file", bulkOrderFile);
    formData.append("email", email);
    formData.append("withCredentials", true);

    axios
      .post("/order/label/bulk", formData, {
        withCredentials: true,
        headers: {
          "Content-Type": "multipart/form-data",
        },
      })
      .then((res) => {
        if (res.data.errMsg) {
          setSectionErrors({ container: res.data.errMsg });
          window.scrollTo({ top: 0, behavior: "smooth" });
        } else {
          setSectionErrors({});
          setSuccessMsg("Your order has been placed. Redirecting...");
          setNumOrders(res.data.numOrders);
          setTotalPrice(res.data.totalPrice);
          setCourier(res.data.courier);
          setClassType(res.data.classType);
          setHasSignature(res.data.signature);
          dispatch(setUserCreditAmount(creditAmount - res.data.totalPrice));
          setTimeout(() => {
            setLoading(false);
            setShowOrderConfirmPopup(false);
            setOrderSuccess(true);
            window.scrollTo({ top: 0, behavior: "smooth" });
            document.body.style.overflow = null;
          }, 1000);
        }
      })
      .catch((e) => {
        Log("Error: ", e);
        if (e?.response?.data?.msg === "Insufficient credit balance.") {
          setSectionErrors({
            container:
              "You have insufficient funds to purchase. Please load your credits first to proceed with your purchase.",
          });
          return;
        }
        setSectionErrors({
          container: "An unexpected error occurred. Please try again later.",
        }); // Axios default error
      })
      .finally(() => {
        setLoading(false);
        setShowOrderConfirmPopup(false);
        window.scrollTo({ top: 0, behavior: "smooth" });
        document.body.style.overflow = null;
      });
  }

  return (
    <>
      {showOrderConfirmPopup && (
        <OrderConfirmPopup
          setShowOrderConfirmPopup={setShowOrderConfirmPopup}
          confirmOrder={confirmOrder}
          loading={loading}
        />
      )}
      {orderSuccess ? (
        <div>
          <BulkOrderSuccess
            numOrders={numOrders}
            totalPrice={totalPrice}
            courier={courier}
            classType={classType}
            hasSignature={hasSignature}
          />
        </div>
      ) : (
        <div className="globalContainer orderLabelContainer">
          <div className="headingContainer">
            <h1>Order Bulk Labels</h1>
            <p>
              Please upload a bulk order file to proceed with placing your
              order.
            </p>
            {sectionErrors?.container && (
              <AlertMessage msg={sectionErrors.container} type="error" />
            )}
            {successMsg && <AlertMessage msg={successMsg} type="success" />}
          </div>
          <div className="orderTotal orderHeader">
            <Button
              fill="outline"
              title="Switch to Single Order"
              text="Switch to Single Order"
              onClickEvent={() => setIsBulkOrder(false)}
            />
            <p>Order Total: Calculated after bulk order file is submitted.</p>
          </div>

          <div id="bulkOrderContainer">
            {bulkOrderFile ? (
              <>
                <div className="bulkOrderSubmit">
                  <h2>Submit Bulk Order</h2>
                  <Button
                    text="Submit order"
                    title="Submit order"
                    onClickEvent={() => validateBulkOrder()}
                    customStyle={{ height: "fit-content" }}
                  />
                </div>
                <div className="bulkOrderTemplate">
                  <div className="instructions">
                    <div className="instructionHeading">
                      <img src="./media/excel-logo.png" alt="Excel Logo" />
                      <h2>{bulkOrderFile.name}</h2>
                    </div>
                    <p>
                      File uploaded successfully. Please click the button below
                      to confirm your bulk order.
                    </p>
                  </div>
                  <div className="removeFileContainer">
                    <input
                      type="button"
                      title="Remove file for submission"
                      onClick={() => setBulkOrderFile(null)}
                      value="Remove"
                    />
                  </div>
                </div>
              </>
            ) : (
              <div>
                {fieldErrors?.bulkOrderFile && (
                  <AlertMessage msg={fieldErrors.bulkOrderFile} type="error" />
                )}
                <div
                  className={`dragdropContainer ${
                    isFileDragEnter ? "active" : ""
                  }`}
                  onDragOver={handleFileDragOver}
                  onDragEnter={handleFileDragEnter}
                  onDragLeave={handleFileDragLeave}
                  onDrop={handleFileDrop}
                >
                  <label htmlFor="fileInput" title="Select a file to upload">
                    <IoCloudUploadOutline />
                    <p>
                      Drag and Drop file here or <span>Choose File</span>
                    </p>
                  </label>
                  <input
                    id="fileInput"
                    type="file"
                    onChange={(e) => handleFileUpload(e.target.files[0])}
                  />
                </div>
              </div>
            )}
            <div className="dragDropFooter">
              <p>Supported formats: XLSX</p>
              <p>Max file size: 2MB</p>
            </div>
            <div className="bulkOrderTemplate">
              <div className="instructions">
                <div className="instructionHeading">
                  <img src="./media/excel-logo.png" alt="Excel Logo" />
                  <h2>Table Template</h2>
                </div>
                <p>
                  You can download the attached template and use it as a
                  starting point to fill in your bulk order details.
                </p>
              </div>
              <a href="./media/kemlabels-bulk-order-template.xlsx" download>
                Download
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
