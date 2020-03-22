#!/usr/bin/python

hostname = 'flyer-dev.c8amc4ajwlqc.us-east-1.rds.amazonaws.com'
username = 'prashan'
password = 'yellow45River'
database = 'flyer'

# Simple routine to run a query on a database and print the results:
def doQuery( conn ) :
    cur = conn.cursor()
    
    cur.execute( "SELECT product_id, name FROM product" )
    
    for product_id, name in cur.fetchall() :
        print product_id, name


import psycopg2
myConnection = psycopg2.connect( host=hostname, user=username, password=password, dbname=database )
doQuery( myConnection )
myConnection.close()
