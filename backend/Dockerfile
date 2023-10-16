# Use an official Node.js runtime as the base image
FROM node:16.14.2

# Set the working directory in the container
WORKDIR .

# Copy package.json and package-lock.json to the working directory
COPY . .

# Install app dependencies
RUN npm install

# Copy the rest of your application's source code to the container
COPY . .

# Expose the port that your Express app will listen on
EXPOSE 3000

# Define the command to run your Express server
CMD [ "node", "server.js" ]