import React, { useState } from "react";
import { useDispatch } from "react-redux";
import { resetAll, loadConfiguration } from "../../redux/actions";
import { useNavigate } from "react-router-dom";
import isElectron from "is-electron";

export default function LoadFile() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [selectedFile, setSelectedFile] = useState();
  const [isFileSelected, setIsFileSelected] = useState(false);

  const handleFileChange = (e) => {
    setSelectedFile(e.target.files[0]);
    setIsFileSelected(true);
  };

  const handleUpload = (e) => {
    e.preventDefault();
    if (isFileSelected) {
      dispatch(resetAll());
      dispatch(loadConfiguration(selectedFile));
      navigate("/mechanism");
    }
  };

  return (
    <div className="row">
      <div className="card card-body load-panel m-2">
        <div className="card card-body load-panel m-2 collapse show">
          <div>
            <h3>
              {isElectron()
                ? "Select configuration JSON file"
                : "Select configuration Zip file"}
            </h3>
          </div>
          <form encType="multipart/form-data">
            <input
              type="file"
              name="file"
              savebutton="jsonConfigSave"
              className="form-control"
              required=""
              onChange={handleFileChange}
            />
            <button
              type="submit"
              className="btn btn-primary m-2"
              onClick={handleUpload}
            >
              Upload
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
