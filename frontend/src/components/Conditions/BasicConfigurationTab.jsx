import React from "react";
import { connect } from "react-redux";

import { getConditions } from "../../redux/selectors";
import { basicConfigSchema } from "../../redux/schemas";

import BasicConfigProperty from "./BasicConfigProperty";
import { Card, Container, Row, Col } from "react-bootstrap";
import Stack from "@mui/material/Stack";
import { ThemeProvider } from "@mui/material";
import theme from "../../theme";

function BasicConfigurationTab(props) {
  return (
    <ThemeProvider theme={theme}>
      <Stack spacing={2} sx={{ margin: `2%` }}>
        <p className="lead-muted p-2">
          Set general conditions for your simulation here, including how long a
          time you would like to simulate and how often output data are written.
          The chemistry time step determines the time step of the ODE solver. We
          recommend an output time step of 1/100 of the simulation time and a
          chemistry time step equal to the output time step as a first start.
        </p>
        <Container>
          <Row>
            <Col lg={6}>
              <Card className="mb-4 model-options-card shadow-sm">
                <Card.Header>
                  <h4 className="my-0 fw-normal">Basic Configuration</h4>
                </Card.Header>
                <Card.Body className="bg-ncar-body p-3">
                  <Container fluid>
                    <input type="hidden" />
                    {basicConfigSchema.map((param, index) => (
                      <BasicConfigProperty
                        key={`config-${index}`}
                        data={props.data}
                        schema={param}
                      />
                    ))}
                  </Container>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Container>
      </Stack>
    </ThemeProvider>
  );
}

const mapStateToProps = (state) => {
  return { data: getConditions(state, { classKey: "basic" }) };
};

export default connect(mapStateToProps)(BasicConfigurationTab);
