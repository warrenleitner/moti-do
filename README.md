# MotiDo

A simple command-line task management application.

## Installation

(Instructions to be added)

## Usage

(Instructions to be added)

## Development

This project uses Poetry for dependency management and packaging.

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/yourusername/moti-do # TODO: Update URL
    cd moti-do
    ```
2.  **Install dependencies:**
    ```bash
    poetry install
    ```
3.  **Activate virtual environment:**
    ```bash
    poetry shell
    ```

**Development Tools:**

This project uses [Poe the Poet](https://github.com/nat-n/poethepoet) for task running, configured in `pyproject.toml`.

Run tasks using `poetry run poe <task_name>`:

*   **Format Code:** `poetry run poe format` (Applies Black and isort)
*   **Check Formatting:** `poetry run poe format_check`
*   **Lint Code:** `poetry run poe lint`
*   **Type Check:** `poetry run poe typecheck`
*   **Run Tests:** `poetry run poe test`
*   **Check Test Coverage:** `poetry run poe coverage` (Fails if below 80%)
*   **Check Security:** `poetry run poe security`
*   **Run All Checks:** `poetry run poe check` (Runs `format_check`, `lint`, `typecheck`, `test`, `security`)

## License

This project is licensed under the MIT License. See the `LICENSE` file for details. (TODO: Add LICENSE file or confirm MIT in pyproject.toml) 