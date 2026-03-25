import { useSelector, useDispatch } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { Button } from './ui/button'
import { runSimulation, setResults, setStatus, setMetadata, setError } from '../redux/slices/simulationSlice'
import { Loader2, Play } from 'lucide-react'
import { MusicBox } from '@ncar/music-box';
import analyticalConfig from '@ncar/music-box/examples/ts1/my_config.json' with { type: 'json' };

// Sample JSON data for testing - update this with your actual data
const SAMPLE_SIMULATION_DATA = {
  "columns": [
    "time.s",
    "CONC.A.mol m-3",
    "CONC.B.mol m-3",
    "CONC.C.mol m-3"
  ],
  "height": 101,
  "data": {
    "time.s": [
      0, 6, 12, 18, 24, 30, 36, 42, 48, 54, 60, 66, 72, 78, 84, 90, 96, 102, 108, 114, 120, 126, 132, 138, 144, 150, 156, 162, 168, 174, 180, 186, 192, 198, 204, 210, 216, 222, 228, 234, 240, 246, 252, 258, 264, 270, 276, 282, 288, 294, 300, 306, 312, 318, 324, 330, 336, 342, 348, 354, 360, 366, 372, 378, 384, 390, 396, 402, 408, 414, 420, 426, 432, 438, 444, 450, 456, 462, 468, 474, 480, 486, 492, 498, 504, 510, 516, 522, 528, 534, 540, 546, 552, 558, 564, 570, 576, 582, 588, 594, 600
    ],
    "CONC.A.mol m-3": [
      0.8, 0.7757227050881892, 0.752182143968582, 0.7293559592803868, 0.7072224721144578, 0.6857606614432369, 0.6649501441562747, 0.6447711557016015, 0.6252045313145698, 0.6062316878163347, 0.587834605964695, 0.5699958133405206, 0.5526983677535218, 0.5359258411515968, 0.5196623040184769, 0.5038923102448489, 0.48860088245858835, 0.4737734978001713, 0.4593960741297543, 0.44545495665282075, 0.43193690495169706, 0.4188290804106151, 0.40611903402238436, 0.393794694565087, 0.3818443571375747, 0.37025667204287066, 0.3590206340089234, 0.34812557173647607, 0.3375611377641215, 0.3273172986409171, 0.31738432539723044, 0.3077527843047608, 0.29841352791696196, 0.2893576863813602, 0.280576659015513, 0.2720621061386075, 0.2638059411509436, 0.25580032285378007, 0.24803764800224262, 0.24051054408423045, 0.23321186231845556, 0.2261346708649699, 0.2192722482417287, 0.21261807694094, 0.20616583723913504, 0.1999094011950836, 0.19384282682985113, 0.18796035248347145, 0.18225639134287672, 0.17672552613588463, 0.1713625039862061, 0.1661622314245856, 0.1611197695513367, 0.1562303293456784, 0.1514892671174171, 0.14689208009665483, 0.1424344021573344, 0.13811199967056156, 0.13392076748376316, 0.12985672502186577, 0.12591601250679016, 0.12209488729167048, 0.11838972030631797, 0.11479699261055304, 0.11131329205213175, 0.10793531002609319, 0.10465983833244964, 0.10148376612923485, 0.09840407697801737, 0.09541784597907274, 0.09252223699349293, 0.08971449994959595, 0.08699196823107631, 0.08435205614441679, 0.08179225646315513, 0.07931013804667462, 0.07690334353125565, 0.0745695870911965, 0.07230665226787628, 0.0701123898646988, 0.06798471590591733, 0.06592160965740237, 0.06392111170747249, 0.0619813221059654, 0.060100398559781956, 0.05827655468318889, 0.05650805830121981, 0.05479322980456143, 0.05313044055436373, 0.051518111335458826, 0.04995471085651938, 0.048438754295731995, 0.046968801890604636, 0.04554345757056853, 0.04416136763107615, 0.04282121944793561, 0.04152174023066088, 0.04026169581365341, 0.0390398894840674, 0.03785516084524549, 0.03670638471464516
    ],
    "CONC.B.mol m-3": [
      0.2, 3.979221080693813e-8, 3.8584651759818904e-8, 3.741373804661578e-8, 3.6278357605354695e-8, 3.517743212138199e-8, 3.410991600324788e-8, 3.307479538966751e-8, 3.207108718661774e-8, 3.109783813365495e-8, 3.015412389856662e-8, 2.9239048199497508e-8, 2.835174195371581e-8, 2.7491362452212266e-8, 2.6657092559346357e-8, 2.5848139936781354e-8, 2.506373629096983e-8, 2.4303136643475693e-8, 2.3565618623439292e-8, 2.285048178151414e-8, 2.2157046924622782e-8, 2.148465547090121e-8, 2.0832668824218014e-8, 2.0200467767675164e-8, 1.9587451875513623e-8, 1.8993038942865883e-8, 1.8416664432813657e-8, 1.7857780940225087e-8, 1.7315857671863184e-8, 1.679037994227093e-8, 1.628084868495455e-8, 1.578677997840087e-8, 1.5307704586478332e-8, 1.4843167512785327e-8, 1.4392727568522561e-8, 1.3955956953478963e-8, 1.3532440849733324e-8, 1.3121777027685737e-8, 1.2723575464044542e-8, 1.2337457971406216e-8, 1.1963057839076129e-8, 1.1600019484789288e-8, 1.1247998117000033e-8, 1.090665940742036e-8, 1.0575679173495237e-8, 1.0254743070514069e-8, 9.943546293065274e-9, 9.641793285550907e-9, 9.349197461486009e-9, 9.065480931316413e-9, 8.7903742384963e-9, 8.523616103574867e-9, 8.264953176049162e-9, 8.014139793747358e-9, 7.770937749513854e-9, 7.535116064974802e-9, 7.306450771168925e-9, 7.08472469583568e-9, 6.86972725715823e-9, 6.661254263765845e-9, 6.459107720805487e-9, 6.263095641898433e-9, 6.073031866803314e-9, 5.8887358846126796e-9, 5.710032662314728e-9, 5.53675247855771e-9, 5.3687307624590376e-9, 5.205807937305923e-9, 5.047829268999247e-9, 4.894644719096575e-9, 4.746108802314874e-9, 4.602080448357515e-9, 4.462422867934374e-9, 4.327003422847748e-9, 4.195693500020731e-9, 4.06836838934842e-9, 3.9449071652559204e-9, 3.825192571850629e-9, 3.70911091155982e-9, 3.596551937147628e-9, 3.4874087470090308e-9, 3.381577683641247e-9, 3.2789582351961937e-9, 3.1794529400205088e-9, 3.0829672940924888e-9, 2.989409661267905e-9, 2.89869118624967e-9, 2.810725710198511e-9, 2.7254296889045993e-9, 2.642722113442357e-9, 2.562524433233226e-9, 2.484760481443065e-9, 2.4093564026436144e-9, 2.3362405826691277e-9, 2.265343580601648e-9, 2.196598062820264e-9, 2.1299387390517883e-9, 2.0653023003620547e-9, 2.002627359028978e-9, 1.9418543902402676e-9, 1.882925675560414e-9
    ],
    "CONC.C.mol m-3": [
      0, 0.2242772551196, 0.2478178174467661, 0.27064400330587496, 0.29277749160718497, 0.31423930337933104, 0.335049821733809, 0.3552288112236024, 0.3747954366143429, 0.3937682810858272, 0.4121653638811814, 0.4300041574204318, 0.44730160389473694, 0.46407413135704134, 0.48033766932443117, 0.496107663907012, 0.5113990924776761, 0.5262264778966926, 0.5406039023046276, 0.5545450204966972, 0.5680630728912557, 0.581170898104729, 0.5938809451449468, 0.6062052852344453, 0.6181556232749731, 0.6297433089640903, 0.6409793475744124, 0.651874410405743, 0.6624388449200213, 0.6726826845687033, 0.6826156583219212, 0.6922471999084597, 0.7015864567753339, 0.7106422987754728, 0.7194233265917602, 0.7279378799054365, 0.7361940453166164, 0.7441996640244442, 0.7519623392741832, 0.7594894435783129, 0.766788125718488, 0.7738653175350125, 0.7807277405102747, 0.7873819121524025, 0.7938341521851883, 0.8000905885501758, 0.8061571632266051, 0.8120396378747384, 0.8177435993079293, 0.8232744647986383, 0.8286374872234241, 0.8338377600518028, 0.8388802221837144, 0.8437696626401857, 0.8485107251116488, 0.8531079123682324, 0.8575655905362175, 0.8618879932447164, 0.866079225646512, 0.8701432683168824, 0.8740839810341046, 0.8779051064452366, 0.8816102736206533, 0.8852030015007145, 0.888686702237839, 0.8920646844371577, 0.895340156298823, 0.8985162286649608, 0.9015959179741565, 0.9045821491262857, 0.9074777582604012, 0.9102854954483262, 0.9130080273065038, 0.9156479395285826, 0.9182077393411543, 0.92068985788496, 0.9230966525238402, 0.9254304090836137, 0.9276933440230161, 0.929887606538753, 0.9320152806066779, 0.9340783869610235, 0.9360788850135731, 0.9380186747145854, 0.9398995983572549, 0.9417234423274059, 0.9434919388000934, 0.945206767384717, 0.9468695567202112, 0.9484818860218238, 0.950045286580961, 0.9515612432195123, 0.9530311957000442, 0.9544565400931961, 0.9558386301035855, 0.957178778355471, 0.9584782576394052, 0.959738302121049, 0.96096010851331, 0.9621448372129049, 0.9632936134024341
    ]
  }
}


/**
 * RunSimulationButton Component
 * Compact button to run simulations from any page
 */
export function RunSimulationButton({ className = '' }) {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const simulation = useSelector((state) => state.simulation)
  const mechanism = useSelector((state) => state.mechanism.selectedMechanism)
  const mechanismData = useSelector((state) => state.mechanism)
  const currentExample = useSelector((state) => state.mechanism.currentExample)
  const conditions = useSelector((state) => state.conditions)
  const loadedExample = useSelector((state) => state.conditions.exampleLoaded)

  const downloadJSON = (data) => {
    const blob = new Blob(
      [JSON.stringify(data, null, 2)],
      { type: 'application/json' }
    );

    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'config.json'; // filename
    a.click();

    URL.revokeObjectURL(url);
  };

  const stripExtraFields = (config) => {
    return {
      ...(config ?? {}),
      ...(config?.["__source file"] != null
        ? { "__source file": config["__source file"] }
        : {}),
      mechanism: {
        ...(config?.mechanism ?? {}),
        reactions: (config?.mechanism?.reactions ?? []).map(({ id, name, ...rest }) => ({
          ...rest
        })),
        species: (config?.mechanism?.species ?? []).map(({ name }) => ({
          name
        })),
        phases: (config?.mechanism?.phases ?? []).map(p => ({
          ...p,
          species: (p.species ?? []).map(({ name }) => ({
            name
          }))
        })),
        version: config?.mechanism?.version ?? "1.0.0"
      }
    };
  };

  // const handleRunSimulation = async () => {
  //   // Prepare simulation configuration
  //   const config = {
  //     mechanism,
  //     species: mechanismData.species,
  //     reactions: mechanismData.reactions,
  //     temperature: conditions.initial.temperature,
  //     pressure: conditions.initial.pressure,
  //     timeStep: conditions.basic.timeStep,
  //     duration: conditions.basic.duration,
  //     initialConcentrations: conditions.initial.concentrations,
  //     rateConstants: conditions.rateConstants,
  //     outputFrequency: conditions.basic.outputFrequency,
  //   }

  //   try {
  //     // Run simulation
  //     await dispatch(runSimulation(config)).unwrap()

  //     // Navigate to results page on success (only if not already there)
  //     const currentPath = window.location.pathname
  //     if (!currentPath.includes('/plots')) {
  //       navigate('/plots')
  //     }
  //   } catch (error) {
  //     console.error('Simulation failed:', error)
  //     // Stay on current page to show error
  //   }
  // }

  async function handleRunSimulation() {
    // console.log(simulation);
    // console.log(mechanism);
    // console.log(mechanismData);
    // console.log(conditions);

    const finalMechanism = {
      // Include "__source file" at the top level if it exists
      ...(conditions?.source_file != null
        ? { "__source file": conditions.source_file }
        : {}),

      "box model options": {
        "grid": "box",
        "chemistry time step [sec]": conditions.basic.timeStep,
        "output time step [sec]": conditions.basic.outputFrequency,
        "simulation length [sec]": conditions.basic.duration
      },

      "conditions": conditions.conditions,

      "mechanism": {
        "name": mechanismData.currentExample,
        "reactions": mechanismData.reactions,
        "species": mechanismData.species,
        "phases": [{
          "name": "gas",
          "species": mechanismData.species,
        }],
        "version": "1.0.0",
      }
    }

    const cleaned = stripExtraFields(finalMechanism);

    // console.log(mechanismData);
    // console.log(conditions);
    // console.log(cleaned);
    // downloadJSON(cleaned);

    // MICM doesn't like the extra fields in our custom config, so we strip them out
    // const box = MusicBox.fromJson(cleaned);
    // const results = await box.solve();
    // console.log(results);

    const box = MusicBox.fromJson(cleaned);
    const results = await box.solve();
    console.log('Raw simulation results:', results);

    // Normalize the results to work with the plots
    const normalizedResults = normalizeManualResults(results)
    console.log('Normalized simulation results:', normalizedResults)
    console.log('Normalized results length:', normalizedResults.length)

    if (normalizedResults.length > 0) {
      dispatch(setResults(normalizedResults))
      dispatch(setMetadata({
        mechanism: mechanismData.currentExample || mechanismData.mechanism?.mechanism?.name || 'local',
        duration: conditions.basic.duration || 0,
      }))
      dispatch(setStatus('succeeded'))
      navigate('/plots')
    } else {
      console.error('No valid results after normalization')
    }

    // downloadJSON(results);
  }

  const normalizeManualResults = (raw) => {
    // Handle new format: { columns: [...], data: { columnName: [...] } }
    if (raw && typeof raw === 'object' && raw.columns && raw.data) {
      const { columns, data } = raw
      const timeColumn = columns[0] // Assume first column is time
      const speciesColumns = columns.slice(1)
      
      if (!data[timeColumn] || !Array.isArray(data[timeColumn])) {
        return []
      }
      
      const timeValues = data[timeColumn]
      const normalized = timeValues.map((time, index) => {
        const concentrations = {}
        speciesColumns.forEach(col => {
          const values = data[col]
          if (Array.isArray(values) && values[index] !== undefined) {
            concentrations[col] = values[index]
          }
        })
        return {
          time: time,
          concentrations: concentrations,
        }
      })
      return normalized
    }

    // Handle existing formats
    const points = Array.isArray(raw) ? raw : Array.isArray(raw?.results) ? raw.results : []
    if (points.length === 0) return []

    const normalized = points
      .map((point, i) => {
        if (!point || typeof point !== 'object') return null

        // If already in expected shape
        if (point.concentrations && typeof point.concentrations === 'object') {
          return {
            time: point.time ?? point.timestamp ?? i,
            concentrations: point.concentrations,
          }
        }

        // Convert from flat species keys (all numeric values except time)
        const outConcentrations = {}
        Object.entries(point).forEach(([key, value]) => {
          if (key === 'time' || key === 'timestamp' || key === 'date') return
          if (key === 'concentrations') return

          // accept numbers or single-value arrays
          if (typeof value === 'number') {
            outConcentrations[key] = value
          } else if (Array.isArray(value) && value.length === 1 && typeof value[0] === 'number') {
            outConcentrations[key] = value[0]
          }
        })

        if (Object.keys(outConcentrations).length > 0) {
          return {
            time: point.time ?? point.timestamp ?? i,
            concentrations: outConcentrations,
          }
        }

        return null
      })
      .filter((pt) => pt !== null)

    return normalized
  }

  async function handleRunSimulationWithRedux() {
    // Keep existing local MusicBox behavior exactly as-is
    // await handleRunSimulation()

    // Use the sample data defined above
    const manualJsonData = SAMPLE_SIMULATION_DATA
    console.log('Using sample data:', manualJsonData)
    const manualPoints = normalizeManualResults(manualJsonData)
    console.log('manualPoints:', manualPoints)

    if (manualPoints.length > 0) {
      dispatch(setResults(manualPoints))
      dispatch(setMetadata({
        mechanism: 'sample-data',
        duration: 1800, // matches the last time point
      }))
      dispatch(setStatus('succeeded'))
      navigate('/plots')
      return
    }

    // If no explicit JSON is provided, run the local mechanism JSON through MusicBox and set results for plots.
    console.log('mechanismData.mechanism:', mechanismData.mechanism)
    try {
      const box = MusicBox.fromJson(mechanismData.mechanism)
      const results = await box.solve()
      console.log('local MusicBox results:', results)
      dispatch(setResults(results))
      dispatch(setMetadata({
        mechanism: mechanismData.currentExample || mechanismData.mechanism?.mechanism?.name || 'local',
        duration: conditions.basic.duration || 0,
      }))
      dispatch(setStatus('succeeded'))
      navigate('/plots')
    } catch (error) {
      console.error('Local JSON simulation failed:', error)
      dispatch(setStatus('failed'))
      dispatch(setError(error.message || error))
    }
  }

  // Check if we have a valid mechanism configuration
  // For predefined mechanisms: need example loaded
  // For custom mechanisms: need at least 1 species and 1 reaction
  const isPredefinedMechanism = mechanism && mechanism !== 'custom'
  const isCustomMechanism = mechanism === 'custom'

  const hasValidPredefined = isPredefinedMechanism && currentExample && currentExample.id
  const hasValidCustom = isCustomMechanism && mechanismData.species.length > 0 && mechanismData.reactions.length > 0

  const hasValidMechanism = hasValidPredefined || hasValidCustom
  // const isDisabled = simulation.status === 'running' || !hasValidMechanism
  const isDisabled = loadedExample;

  // Generate helpful tooltip message
  const getTooltip = () => {
    if (simulation.status === 'running') return 'Simulation is currently running...'
    if (isCustomMechanism && mechanismData.species.length === 0) return 'Add at least 1 species to run simulation'
    if (isCustomMechanism && mechanismData.reactions.length === 0) return 'Add at least 1 reaction to run simulation'
    if (isPredefinedMechanism && !currentExample) return 'Please select an example mechanism'
    return 'Run atmospheric chemistry simulation'
  }

  return (
    <Button
      // onClick={handleRunSimulationWithRedux}
      onClick={handleRunSimulation}
      disabled={isDisabled}
      variant="apple"
      size="lg"
      className={`rounded-2xl mt-2 mb-2 ${className}`}
      title={getTooltip()}
    >
      {simulation.status === 'running' ? (
        <>
          <Loader2 className="w-full h-4 mr-2 animate-spin" />
          Running...
        </>
      ) : (
        <>
          <Play className="w-full h-4 mr-2" />
          Run Simulation
        </>
      )}
    </Button>
  )
}

export default RunSimulationButton
