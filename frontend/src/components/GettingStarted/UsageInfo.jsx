import React from "react";

export default function UsageInfo() {
  const options_methods = [
    "Start from scratch",
    "Select example",
    "Load configuration",
  ];

  const description_scratch =
    "This option allows you to build a simulation from the ground up." +
    " There are no species, no reactions, and only minimal conditions." +
    " You will need to add at least one reaction before you run a simulation.";

  const description_example =
    "Examples are fully functional MusicBox configurations. " +
    " You can select an example and immediately run the simulation." +
    " Examples are useful for learning how to set up a MusicBox simulation.";

  const description_config =
    "If you have previously saved a MusicBox configuration from the " +
    '<Link to="/conditions/review.html">review</Link>' +
    " section, you can reload it with this starting option. MusicBox configuration files have a .zip extension and contain the mechanism and conditions for a simulation. " +
    " Once loaded, you can modify the configuration, re-save it, and/or run the simulation.";

  const descriptions_methods = [
    description_scratch,
    description_example,
    description_config,
  ];

  const methodInfoCards = options_methods.map((elem, index) => {
    return (
      <InfoCard
        option={elem}
        description={descriptions_methods[index]}
        key={index}
      />
    );
  });

  const options_conditions = [
    '<Link to="conditions/options.html">General</Link>',
    '<Link to="conditions/initial.html">Initial</Link>',
    '<Link to="conditions/evolving.html">Evolving</Link>',
    '<Link to="conditions/review.html">Review</Link>',
  ];

  const description_general =
    "General model options: total simulation time, time step, output options, etc.";

  const description_initial =
    "Starting conditions for chemical species concentrations, environmental conditions, and reaction rates/rate constants for reactions with a" +
    " <code>MUSICA name</code>." +
    " These conditions will remain at the values you set here until they are modified by the chemical solver (species concentrations) or updated from the" +
    ' <Link to="conditions/evolving">evolving conditions</Link>' +
    " you specify. You can enter the conditions directly, or load them from a text file following the instructions on the" +
    ' <Link to="conditions/initial">initial conditions</Link>' +
    " page.";

  const description_evolving =
    "Several types of reactions include a <code>MUSICA name</code> property." +
    " This is a unique name that you choose to identify this reaction in other parts of MusicBox." +
    " For example, setting the" +
    " <code>MUSICA name</code>" +
    " property of a photolysis reaction, allows you to set the photolysis rate constant in the" +
    ' <Link to="/conditions/initial">initial</Link> or <Link to="/conditions/evolving">evolving</Link>' +
    " conditions pages.";

  const description_review =
    "The final step of the MusicBox configuration." +
    " This page allows you to review the raw MusicBox configuration data and download the configuration for future use.";

  const descriptions_conditions = [
    description_general,
    description_initial,
    description_evolving,
    description_review,
  ];

  const conditionsInfoCards = options_conditions.map((elem, index) => {
    return (
      <InfoCard
        option={elem}
        description={descriptions_conditions[index]}
        key={index}
      />
    );
  });

  const description_step1 =
    "To start using MusicBox, select one of the starting options above." +
    " Each of these starting options is described in more detail below.";

  const description_step2 =
    "Navigate to the" +
    ' <Link to="/mechanism/species.html">Chemical species</Link>' +
    " page in the Mechanism section to add or modify the set of chemical species in the system." +
    " At minimum, there will be a single species named 'M' that represents any chemical species, and can be used for third-body reactions." +
    " Any number of species can be added to the set by clicking the 'Add' button above the list of species." +
    " Clicking on a species in the list will allow you to edit its properties." +
    " Some reactions will require specific species properties to be specified, so be sure to set them here.";

  const description_step3 =
    "Navigate to the" +
    ' <Link to="/mechanism/reactions.html">Reactions</Link>' +
    " page in the Mechanism section to add or modify the set of reactions in the system." +
    " Any chemical species set in Step 2 will be available to participate in a reaction." +
    " In addition to chemical reactions, emissions and loss of chemical species can be included in the set of reactions." +
    " Add a reaction by clicking the 'Add' button above the list of reactions, or modify an existing reaction by clicking on it in the list of reactions." +
    " At least one reaction must be present to run a simulation." +
    "<br /><br />" +
    "Several types of reactions include a <code>MUSICA name</code> property." +
    " This is a unique name that you choose to identify this reaction in other parts of MusicBox." +
    " For example, setting the <code>MUSICA name</code> property of a photolysis reaction, allows you to set the photolysis rate constant in the" +
    ' <Link to="/conditions/initial">initial</Link> or <Link to="/conditions/evolving">evolving</Link>' +
    " conditions pages.";

  const description_step4 =
    "Navgiate to the" +
    ' <Link to="/conditions.html">Conditions</Link>' +
    " section to set model options and physical/chemical conditions for the simulation, and download the MusicBox configuration for future use." +
    " Each page of the conditions section is described below.";

  const description_step5 =
    "Click the green 'Run Model' button to run the model with the mechanism and conditions you set in the previous steps." +
    " Once the model run is finished, you will see options to plot the results and download the model output for off-line analysis." +
    " If you see an error message, you may have to modify your configuration and try again.";

  const descriptions_steps = [
    description_step1,
    description_step2,
    description_step3,
    description_step4,
    description_step5,
  ];

  // both start and end are included
  const generate_steps = (start, end) => {
    var steps = [];
    for (; start <= end; start++) {
      steps.push(
        <Step
          count={start}
          description={descriptions_steps[start - 1]}
          key={start}
        />,
      );
    }
    return steps;
  };

  const stepOne = generate_steps(1, 1);
  const stepTwoToFour = generate_steps(2, 4);
  const stepFive = generate_steps(5, 5);

  return (
    <section id="how-to-use">
      <div className="container">
        <h1 className="pb-2 display-6 text-center">How to use MusicBox</h1>
        {stepOne}
        <div className="row row-cols-1 row-cols-md-3 mb-3">
          {methodInfoCards}
        </div>
        {stepTwoToFour}
        <div className="row row-cols-1 row-cols-md-2 row-cols-lg-4 mb-3">
          {conditionsInfoCards}
        </div>
        {stepFive}
      </div>
    </section>
  );
}

function Step(props) {
  return (
    <div className="p-3">
      <p className="lead">
        <strong className="about-heading">Step {props.count}. </strong>
        <span dangerouslySetInnerHTML={{ __html: props.description }}></span>
      </p>
    </div>
  );
}

function InfoCard(props) {
  return (
    <div className="col">
      <div className="card mb-4 shadow-sm">
        <div className="card-header text-center">
          <h4
            className="my-0 fw-normal"
            dangerouslySetInnerHTML={{ __html: props.option }}
          ></h4>
        </div>
        <div className="card-body">
          <p dangerouslySetInnerHTML={{ __html: props.description }}></p>
        </div>
      </div>
    </div>
  );
}
