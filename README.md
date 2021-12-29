WHAT THIS IS?
----------

This project contains various scripts, to test and improve performance on loading and searching millions of records in DBMS.

The scripts run with NodeJS and the database used is MySQL 8 .


COMMANDS
--------

i) To launch the MySQL server follow the steps:

1) edit mysql-db/docker-compose.yml in the following line

    `
    volumes: 
        - /home/defaultuser/docker/volumes/mysql-db:/var/lib/mysql // Specify the folder for MySQL database
    `

2) In the command line: `$ cd mysql-db`
3) and then `$ docker-compose up`

ii) To populate all given names and surnames run:

1) `$ node loadGivenNamesAndSurnames.js`

iii) To populate 20 millions (or more) person records:

1) Open the file createPersons.js and edit the variable **NUM_PERSONS** to 20000000

2) Run the command `$ node createPersons.js`


iv) To run the web application to perform some queries run:

1) `$ cd search-person-webapp`
2) `$ node index.js`
3) Access http://localhost:3000/

CREDITS
-------

The given names and surnames I got from here https://github.com/smashew/NameDatabases


LICENSE
-------

MIT License

Copyright (c) 2021 Apps Sonatina

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
