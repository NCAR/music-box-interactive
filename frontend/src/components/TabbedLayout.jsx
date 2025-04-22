import React, { useState } from "react";
import { connect } from "react-redux";
import { Container, Button } from "react-bootstrap";
import Layout from "./Layout";

function TabedLayout({ tabs, title }) {
  const [activeTab, setActiveTab] = useState(0);

  const tabIndexMap = tabs.reduce((acc, tab, index) => {
    acc[tab.label] = index;
    return acc;
  }, {});

  return (
    <Layout title={title}>
      <main role="main">
        <Container className="text-center">
          <div
            className="navbox pt-2"
            style={{ display: "flex", justifyContent: "space-around" }}
          >
            {tabs.map((tab, index) => (
              <Button
                key={index}
                variant={activeTab === index ? "primary" : "secondary"}
                className="mr-2"
                onClick={() => setActiveTab(index)}
              >
                {tab.label}
              </Button>
            ))}
          </div>
        </Container>
        {tabs.map(
          (tab, index) =>
            activeTab === index && (
              <tab.component
                key={index}
                tabIndexMap={tabIndexMap}
                setActiveTab={setActiveTab}
              />
            ),
        )}
      </main>
    </Layout>
  );
}

export default connect()(TabedLayout);
