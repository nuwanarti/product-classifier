#!/usr/bin/python

hostname = 'flyer-dev.c8amc4ajwlqc.us-east-1.rds.amazonaws.com'
username = 'prashan'
password = 'yellow45River'
database = 'flyer'

# Simple routine to run a query on a database and print the results:
def getCategoryId( conn, name, cur) :

    print 'came to doQuery'
    cur.execute( "SELECT category_id FROM category WHERE name='" + name + "'")

    for category_id in cur.fetchall() :
        return category_id[0]


import psycopg2
from datetime import datetime
# myConnection = psycopg2.connect( host=hostname, user=username, password=password, dbname=database )
# doQuery( myConnection )
# myConnection.close()


def hello(param) :

    print "hi there , this is a call from another file "

# def getCategoryId(category):
#     conn = psycopg2.connect( host=hostname, user=username, password=password, dbname=database )
#     cur = conn.cursor()
#     doQuery(conn,'xxx')
#     print (category[0].upper() + category[1:].lower())
#     cur.execute("SELECT category_id FROM category WHERE name='" + (category[0].upper() + category[1:].lower()) + "'")
#     for category_id in cur.fetchall() :
#         print category_id
#         conn.close()
#         return category_id

def productUpdate(categoryId, productName, cur, conn, imgUrl):
    # query = "SELECT * FROM product where name=%s;"
    # print 'came to doQuery'
    cur.execute( "SELECT * FROM product WHERE name='" + productName + "'")
    # print 'printing existing vavlues ', cur.fetchall()
    for name in cur.fetchall() :
        print 'printing fetched values ' , name
        return "none"
    # if(len(cur.fetchall()) == 0):
    print 'came to upload products '
    query =  "INSERT INTO product (category_id, name, image_url, enabled, created_at, updated_at) VALUES (%s, %s, %s, %s, %s, %s);"
    data = (categoryId, productName, imgUrl, True, datetime.now(), datetime.now())

    cur.execute(query, data)
    conn.commit()
    #     return category_id[0]
    #
    # query =  "INSERT INTO product (category_id, name, image_url, enabled, created_at, updated_at) VALUES (%s, %s, %s, %s, %s, %s);"
    # data = (categoryId, productName, imgUrl, True, datetime.now(), datetime.now())
    #
    # cur.execute(query, data)
    # conn.commit()
    print 'return nothing'
    return "none"

def insertCategory(cur, category, conn):
    print 'came to insert category'
    query = "INSERT INTO category (category_id, name, image_url, enabled, created_at, updated_at, parent_id) VALUES (%s, %s, %s, %s, %s, %s, %s);"
    categoryId = category[0].upper() + category[1:].lower()
    data = (categoryId, categoryId, '', True, datetime.now(), datetime.now(), '')
    cur.execute(query, data)
    # categoryId = cur.fetchone()[0]
        # commit the changes to the database
    conn.commit()

def insertProduct(name, category, imgUrl):
    # getCategoryId('tuna')
    conn = psycopg2.connect( host=hostname, user=username, password=password, dbname=database )
    cur = conn.cursor()
    # old
    # print 'XXXXX' + category[0].upper() + category[1:].lower()
    # new
    print 'XXXX' ,category
    # return;
    # old
    # categoryId = getCategoryId(conn, category[0].upper() + category[1:].lower(), cur)
    # new
    categoryId = getCategoryId(conn, category, cur)
    print "Category id is : %s" %categoryId
    # return;
    if categoryId is not None:
        print 'came to update product'
        print 'categoryId %s' %categoryId
        print 'name %s' %name

        return productUpdate(categoryId, name, cur, conn, imgUrl)
    else:
        return category
        # print 'came to insert'
        # print 'categoryId %s' %categoryId
        # print 'name %s' %name
        # insertCategory(cur, category, conn)
        # productUpdate(categoryId, name, cur, conn)
    # if(categoryId )
    # cur.execute( "SELECT product_id, name FROM product WHERE name='" + 'Tuna'+ "'")
