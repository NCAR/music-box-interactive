import React from "react";
import { connect } from "react-redux";
import { CSVLink } from "react-csv";
import { getEvolvingTable } from "../../redux/selectors";

const DownloadEvolvingConditions = (props) => {
  return (
    <CSVLink
      data={props.table}
      filename="evolving_conditions.csv"
      className="btn btn-secondary"
      enclosingCharacter={""}
    >
      Download CSV
    </CSVLink>
  );
};

const mapStateToProps = (state) => {
  return {
    table: getEvolvingTable(state),
  };
};
export default connect(mapStateToProps)(DownloadEvolvingConditions);
