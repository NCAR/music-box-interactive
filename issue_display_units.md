Some users want molecule-based units, but the app does not supply them. For example, a stratospheric ozone class gives rate constants in cm3 molecule-1 s-1 and concentrations in molecules cm-3. The app accepts only mol m-3 for the rate parameters and only mol m-3 or mixing ratios for concentrations. The students must convert each value by hand, and this causes errors. The time fields also accept only seconds and hours, so a user must enter 30 days as 720 hours.

**Acceptance criteria**
- The settings dialog has a section for display units
  - for each reaction type, the user can select a display unit for each rate parameter that has a unit (for example, A in Arrhenius, k0 and kinf in Troe)
  - the unit options include the SI unit (`(mol m^-3)^-(n-1) s^-1`) and the molecule unit (`(molecule cm^-3)^-(n-1) s^-1`)
- The reaction editors show and accept the rate parameter values in the selected unit
- The mechanism stores the rate parameter values in SI units. The app converts the values only for display and input
- The concentration unit list includes molecules cm-3
- The time unit lists include days
- The app saves the display preferences in local storage and loads them when the user opens the app again
  - if local storage is not available, the app uses the SI defaults and continues to operate
- Downloaded configurations always use SI units, independent of the display preferences

**Ideas**
- the order n of a reaction comes from the number of reactants (and third bodies), so the conversion factor for A changes with each reaction. Calculate the factor from the reaction, not from the reaction type alone
- show a "stored as" hint below the input field when the display unit is not SI, the same as the Environment tab does for pressure and temperature
- consider one global switch ("SI" or "molecule cm-3") in addition to the settings for each parameter, so a class can change all units in one step
- add a "reset to defaults" button for the unit preferences
