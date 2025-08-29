# **bazaarly.ai** 🛍️

**bazaarly.ai** (One Stop Shop) is an AI-powered shopping assistant that acts as a personal salesman. It interacts with users to understand their preferences, scrapes the web for real-time products, and uses AI to recommend the best options automatically.

-----

## **Project Structure**

This project is built with a modular architecture, with each component handling a specific part of the user journey.

```
bazaarly.ai/
├─ shopping/    # The main AI interface (ShoppingAI)
│  ├─ package.json
│  └─ ...
├─ mistral/     # The AI backend server (Mistral)
│  ├─ package.json
│  └─ server.js
├─ scrapper/    # The web scraping server (Scrapper)
│  ├─ package.json
│  └─ server.js
└─ README.md    # This documentation file
```

-----

## **Key Features**

  * **Interactive AI Chat:** Engages users with a series of questions to pinpoint their exact needs.
  * **Real-time Product Scraping:** Dynamically fetches product data from multiple online sources.
  * **Intelligent AI Recommendations:** Utilizes AI to analyze scraped data and recommend the most suitable products based on user criteria.
  * **Modular Server Design:** Each server has a dedicated role for efficient and scalable operation:
      * **ShoppingAI:** Manages the user interface and conversation flow.
      * **Mistral Server:** Processes AI logic and recommendation algorithms.
      * **Scrapper Server:** Dedicated to collecting real-time product data.

-----

## **Installation**

To get the project running locally, you'll need to install the dependencies for each of the three servers.

1.  **Clone the repository:**

    ```bash
    git clone https://github.com/harshitparwal4/bazaarly.ai.git
    cd bazaarly.ai
    ```

2.  **Install dependencies:** Navigate to each server's directory and install its dependencies.

    ```bash
    cd shopping
    npm install
    cd ../mistral
    npm install
    cd ../scrapper
    npm install
    ```

-----

## **Usage**

To use the application, you must run all three servers concurrently in separate terminal windows.

1.  **Start ShoppingAI:**

    ```bash
    cd shopping
    npm start
    ```

2.  **Start Mistral Server:**

    ```bash
    cd ../mistral
    node server.js
    ```

3.  **Start Scrapper Server:**

    ```bash
    cd ../scrapper
    node server.js
    ```

Once all servers are running, you can interact with the Bazaarly AI interface in your browser to start your shopping experience.

-----

## **Technical Requirements**

  * **Node.js** \>= 20.x
  * **npm** \>= 10.x
  * A stable internet connection for the web scraper.

-----

## **License**

This project is open-source and licensed under the **MIT License**.
