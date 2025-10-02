from api.controller import get_model_run
import os
import numpy as np

# default which should be updated
N_TIMES = 25

# Get the concentration of number and mass


def get_concentration(session_id):
    model = get_model_run(session_id)
    if 'partmc_output_path' in model.results:
        import PyPartMC as ppmc
        from PyPartMC import si

        output_dir = model.results['partmc_output_path']
        num_conc = np.zeros(N_TIMES)
        mass_conc = np.zeros(N_TIMES)
        time = np.zeros(N_TIMES)
        for i_time in range(N_TIMES):
            path = os.path.join(output_dir, f'result_0001_{i_time + 1:08}.nc')
            aero_data, aero_state, gas_data, gas_state, env_state = ppmc.input_state(path)
            num_conc[i_time] = aero_state.total_num_conc
            mass_conc[i_time] = aero_state.total_mass_conc
            time[i_time] = env_state.elapsed_time + env_state.start_time
        num_list = num_conc.tolist()
        mass_list = mass_conc.tolist()
        time_list = time.tolist()
        result_dict = {
            'time': time_list,
            'number_conc': num_list,
            'mass_conc': mass_list
        }
        return result_dict
    else:
        return {}
