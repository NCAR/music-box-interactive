import React from "react";

export default function Contact() {
  return (
    <div id="contact" className="about-section">
      <div className="container">
        <h1 className="about-heading">Contact the MusicBox team</h1>
        <div className="pt-4">
          <p>
            You can reach us at{" "}
            <a href="mailto: music-box-support@ucar.edu">
              music-box-support@ucar.edu
            </a>{" "}
            to tell us your thoughts about MusicBox. We look forward to hearing
            your ideas and concerns. We're a small team, but we'll try to
            respond promptly.
          </p>
        </div>
      </div>
    </div>
  );
}
