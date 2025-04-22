import React from "react";

const Card = ({ title, onClick }) => {
  return (
    <div className="custom-card-link p-2" onClick={onClick}>
      <div className="card custom-card">
        <div className="card-body">
          <div className="card-content">
            <h5 className="card-title">{title}</h5>
            <span className="custom-card-icon">►</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Card;
