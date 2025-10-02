import React, { useState } from "react";
import { connect } from "react-redux";
import { loadEvolvingConditionsTable } from "../../redux/actions";
import { getPossibleConditions } from "../../redux/selectors";

const UploadEvolvingConditions = (props) => {
  const [file, setFile] = useState();

  const fileReader = new FileReader();

  const handleChangeFile = (e) => {
    setFile(e.target.files[0]);
  };

  const convertTextToTable = (raw_text) => {
    const text = raw_text.replace(/\r/g, "\n").replace(/\n+/g, "\n");
    const header = text.slice(0, text.indexOf("\n")).split(",");
    const rows = text.slice(text.indexOf("\n") + 1).split("\n");
    return [
      [...header.map((name) => name.replace(/^"(.*)"$/, "$1"))],
      ...rows.map((row) =>
        row.split(",").map((val) => parseFloat(val.replace(/^"(.*)"$/, "$1"))),
      ),
    ];
  };

  const validateTable = (table) => {
    if (table[0][0] !== "time.s") {
      return {
        valid: false,
        message: "Missing time.s field in first colummn",
      };
    }
    for (let condition of table[0].slice(1)) {
      if (
        !props.possibleConditions.map((c) => c.tableName).includes(condition)
      ) {
        return {
          valid: false,
          message: "Invalid condition '" + condition + "'",
        };
      }
    }
    return { valid: true, message: "success" };
  };

  const handleUpload = (e) => {
    e.preventDefault();
    if (file) {
      fileReader.onload = (fe) => {
        const table = convertTextToTable(fe.target.result);
        const checkTable = validateTable(table);
        if (checkTable.valid) {
          props.loadEvolvingConditionsTable({
            table: table,
            possibleConditions: props.possibleConditions,
          });
        } else {
          alert("Invalid field(s) in CSV file: " + checkTable.message);
        }
      };
      fileReader.readAsText(file);
      setFile(null);
      document.querySelector('input[id="evolving-conditions-file"]').value = "";
    }
  };

  return (
    <div className="container">
      <div className="row">
        <div className="col-8">
          <input
            id="evolving-conditions-file"
            className="form-control"
            type="file"
            accept=".csv"
            onChange={handleChangeFile}
          />
        </div>
        <div className="col-4">
          <button className="btn btn-primary" onClick={handleUpload}>
            Upload CSV
          </button>
        </div>
      </div>
    </div>
  );
};

const mapStateToProps = (state) => {
  return {
    possibleConditions: getPossibleConditions(state),
  };
};

export default connect(mapStateToProps, { loadEvolvingConditionsTable })(
  UploadEvolvingConditions,
);
