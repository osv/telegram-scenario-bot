#!/bin/bash

RELDIR=$(dirname $0)

BABEL_NODE=$RELDIR/../../node_modules/babel/bin/babel-node

${BABEL_NODE} --stage 0 $RELDIR/index.js
