import csv


def getDescription(uri):
    # with open('bin/productDescription.csv') as csv_file:
    with open(uri) as csv_file:
        csv_reader = csv.reader(csv_file, delimiter=',')
        line_count = 0
        descriptions = []
        # print(" length of : %d", len(csv_reader))
        for row in csv_reader:
                descriptions.append(row[0])
        return descriptions;

def getRows(uri):
    with open(uri) as csv_file:
        csv_reader = csv.reader(csv_file, delimiter=',')
        line_count = 0
        descriptions = []
        # print(" length of : %d", len(csv_reader))
        for row in csv_reader:
                descriptions.append(row)
        return descriptions;

def writeToCSV(resultList):
    with open('bin/result.csv', mode='w') as employee_file:
        employee_writer = csv.writer(employee_file, delimiter=',', quotechar='"', quoting=csv.QUOTE_MINIMAL)
        for description in resultList:
            employee_writer.writerow(description)
