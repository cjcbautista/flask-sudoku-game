import os
import xml.etree.ElementTree as ET
from datetime import datetime

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

XML_FILE = os.path.join(BASE_DIR, "saved_games.xml")


def save_game(name, time_to_complete,hint):

    # --------------------------------
    # Create/load XML
    # --------------------------------

    if os.path.exists(XML_FILE):

        tree = ET.parse(XML_FILE)
        root = tree.getroot()

    else:

        root = ET.Element("games")
        tree = ET.ElementTree(root)


    # --------------------------------
    # Generate incremental ID
    # --------------------------------

    games = root.findall("game")

    if games:

        ids = []

        for game in games:
            id_element = game.find("id")

            if id_element is not None:
                ids.append(int(id_element.text))

        new_id = max(ids) + 1 if ids else 1

    else:

        new_id = 1


    # --------------------------------
    # Add game
    # --------------------------------

    game = ET.SubElement(root, "game")

    ET.SubElement(game, "id").text = str(new_id)

    # rank will be recalculated below
    ET.SubElement(game, "rank").text = "0"

    ET.SubElement(game, "name").text = name

    ET.SubElement(game, "date_completed").text = (
        datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    )

    ET.SubElement(game, "time_to_complete").text = (
        time_to_complete
    )

    ET.SubElement(game, "Hints").text = str(hint)


    # --------------------------------
    # Recalculate ranking
    # --------------------------------

    games = root.findall("game")

    games.sort(
        key=lambda x: time_to_seconds(
            x.find("time_to_complete").text
        )
    )

    for index, game in enumerate(games, start=1):

        game.find("rank").text = str(index)


    # --------------------------------
    # Save
    # --------------------------------

    ET.indent(tree, space="    ")

    tree.write(
        XML_FILE,
        encoding="UTF-8",
        xml_declaration=True
    )


    return {
        "id": new_id,
        "name": name,
        "time_to_complete": time_to_complete
    }


def time_to_seconds(time_string):

    minutes, seconds = map(
        int,
        time_string.split(":")
    )

    return (minutes * 60) + seconds

def get_saved_games():

    if not os.path.exists(XML_FILE):
        return []

    tree = ET.parse(XML_FILE)
    root = tree.getroot()

    games = []

    for game in root.findall("game"):

        games.append({
            "id": game.find("id").text,
            "rank": game.find("rank").text,
            "name": game.find("name").text,
            "date_completed": game.find("date_completed").text,
            "time_to_complete": game.find("time_to_complete").text,
            "hints": game.find("Hints").text if game.find("Hints") is not None else "0"
        })

    return games