const avogadro = 6.02214076e23; // mol-1

function convert(units_in, units_out, data, air_density) {
  if (units_in != "mol m-3") {
    throw "Can only convert away from mol m-3";
  }
  switch (units_out) {
    case "mol m-3": {
      return data;
    }
    case "ppm": {
      return data.map((e, idx) => (e / air_density[idx]) * 1e6);
    }
    case "ppb": {
      return data.map((e, idx) => (e / air_density[idx]) * 1e9);
    }
    case "mol mol-1": {
      return data.map((e, idx) => e / air_density[idx]);
    }
    case "mol cm-3": {
      return data.map((e, idx) => e / 1e6);
    }
    case "molecule m-3": {
      return data.map((e, idx) => e * avogadro);
    }
    case "molecule cm-3": {
      return data.map((e, idx) => (e * avogadro) / 1e6);
    }
  }

  return data;
}

export { convert };
