#!/usr/bin/env python
# apparel-classify
# Command line script to execute classification commands
#
# Author:   Benjamin Bengfort <benjamin@bengfort.com>
# Created:  timestamp
#
# Copyright (C) 2014 Bengfort.com
# For license information, see LICENSE.txt
#
# ID: apparel-classify.py [] benjamin@bengfort.com $

"""
Command line script to execute classification commands.

There are two primary commands:

    - build (builds the model)
    - classify (classifies the input text)

These commands are dependent on configurations found in conf/apparel.yaml
"""

##########################################################################
## Imports
##########################################################################

import os
import sys
import argparse
import json

## Helper to add apparel to Python Path for development
sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

import apparel

from apparel.config import settings
from apparel.build import ClassifierBuilder
from apparel.classify import ApparelClassifier
from insetCategory import hello
from insetCategory import insertProduct

##########################################################################
## Command Constants
##########################################################################

DESCRIPTION = "An administrative utility for classification"
EPILOG      = "Build and use classifiers all from one easy command"
VERSION     = apparel.get_version()

##########################################################################
## Administrative Commands
##########################################################################

resultDic = {}
def classify(args, i=0, j=0):
    # hello("hey this is the call")

    """
    Classifies text using a prebuilt model.
    """
    print('came to classify text %s model %s',args.text, args.model)
    output     = []
    classifier = ApparelClassifier(args.model)

    for text in args.text:
        output.append('"%s" is classified as:' % text)
        for cls in classifier.classify(text):
            output.append("    %s (%0.4f)" % cls)
	    if j==0:
    		resultDic['category'] = cls
    		j=-1
	    if j==1:
    		resultDic['brand']=cls
    		j=-1
	    if j==2:
    		resultDic['volume']=cls
    		j=-1
        output.append("")

    if args.explain:
        for text in args.text:
            classifier.explain(text)
            print "\n\n"
    if i<2:
	if i == 0:
	   args.model = 'fixtures/brand.pickle'
	   j= 1
	if i == 1:
	   args.model = 'fixtures/volume.pickle'
	   j= 2
	print i
	i = i + 1
	classify(args, i,j)
    if i == 2:
	print("PRINTING JSON " + json.dumps(resultDic, indent=4))
    print("category is " + str(resultDic['category'][0]))
    # insertProduct(text, str(resultDic['category'][0]))
    return "\n".join(output)

def build(args):
    """
    Build a classifier model and write to a pickle
    """
    builder = ClassifierBuilder(corpus=args.corpus, outpath=args.outpath)
    builder.build()
    return "Build Complete!"

##########################################################################
## Main method
##########################################################################

if __name__ == '__main__':

    # Construct the main ArgumentParser
    parser = argparse.ArgumentParser(description=DESCRIPTION, epilog=EPILOG, version=VERSION)
    subparsers = parser.add_subparsers(title='commands', description='Administrative commands')

    # Classify Command
    classify_parser = subparsers.add_parser('classify', help='Classify text using a prebuilt model')
    classify_parser.add_argument('text', nargs='+', help='Text to classify, surrounded by quotes')
    classify_parser.add_argument('--explain', default=False, action='store_true', help='Print out an explanation of the classification')
    classify_parser.add_argument('--model', default=settings.get('model'), metavar='PATH', help='Specify the path to the pickled classifier')
    classify_parser.set_defaults(func=classify)
    print 'hi there'
    # Build Command
    build_parser = subparsers.add_parser('build', help='Build a classifier model and write to a pickle')
    build_parser.add_argument('--corpus', default=settings.get('corpus'), type=str, help='Location of the CSV corpus to train from.')
    build_parser.add_argument('-o', '--outpath', metavar='PATH', type=str, help="Where to write the pickle to.", default='fixtures/')
    build_parser.set_defaults(func=build)

    # Handle input from the command line
    args = parser.parse_args()              # Parse the arguments
    try:
        msg = args.func(args)               # Call the default function
        parser.exit(0, msg+"\n")            # Exit cleanly with message
    except Exception as e:
        parser.error(str(e))                # Exit with error
