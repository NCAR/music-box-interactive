import sys
import os
import json
import datetime
from acom_music_box import MusicBox

def main(args):
    # args[0] is the script name itself, so we skip that
    # with open(args[1], 'r') as f:
    #     data = json.load(f)
    #print(json.dumps(data, indent=4))

    box_model = MusicBox()
    box_model.readFromUIJson(args[1])
    box_model.generateConfig("")
    box_model.readConditionsFromJson("./src/configs/_config.json")
    box_model.create_solver("./src/configs/camp_data")
    output = box_model.solve()
    print(json.dumps(output))
    #return output

    # filename = f"results-{int(datetime.datetime.now().timestamp())}.json"

    # # Define the directory
    # dir_path = args[2]

    # with open(dir_path + "/" + filename, 'w') as f:
    #     f.write(json.dumps(output, indent=4))

if __name__ == '__main__':
    main(sys.argv)