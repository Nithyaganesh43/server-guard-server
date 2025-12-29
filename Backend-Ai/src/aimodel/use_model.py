from intent_update import load_and_prepare_data, train_model, load_model, predict_intent
import os

def run_prediction(command):
    try:
        model = load_model()
    except FileNotFoundError:
        print(" No saved model found. Training new one...")
        # Get the absolute path to the CSV file
        csv_path = os.path.join(os.path.dirname(__file__), 'dataset.csv')
        df = load_and_prepare_data(csv_path)
        model = train_model(df)
    return predict_intent(model, command)

if __name__ == "__main__":
    test_command = "fan off"
    intent = run_prediction(test_command)
    print(f" Predicted Intent: {intent}")
