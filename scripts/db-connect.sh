#!/usr/bin/env bash
source .env
mongosh "$DB_CONN_STRING"
