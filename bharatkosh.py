import requests
PAGE_NO = 1

# Cookie
cookies = {
    "cf_clearance": "S77LSrjGdip4cjl877qFM8rc9jSU45oViO7LDEOKWxw-1769355308-1.2.1.1-F2rTeXQW47pql5fsm1c6_nRvKHAiP5OWC5JNkaQGPWqDq2YTyaDUi2Xz.HbOc1sQg5_jLR7RoppKlJZXVR4_YZoDkgU4Oy65ic5qhz7rJM3TpNM4qlB95091jgfoZDgz5YfdExzHOTmTT7sy_R2qc3FMKFOTgSSXi2qUB9daomBa5km9zbXM7eT5jlead9IyN76SyOa69x.u0gkU9O.H7dTDKCsvDmEdco2.tGjspt4"
}

# POST data
# data = {
#     "action": "smwtask",
#     "format": "json",
#     "task": "run-entity-examiner",
#     "params": '{"subject":"इतिहास_सामान्य_ज्ञान_3#0##","is_placeholder":true,"dir":"ltr","uselang":""}',
#     "token": "+\\"
# }

# Optional but recommended headers
headers = {
    "User-Agent": "Mozilla/5.0",
    "Content-Type": "application/x-www-form-urlencoded"
}
url = f"https://bharatdiscovery.org/india/%E0%A4%87%E0%A4%A4%E0%A4%BF%E0%A4%B9%E0%A4%BE%E0%A4%B8_%E0%A4%B8%E0%A4%BE%E0%A4%AE%E0%A4%BE%E0%A4%A8%E0%A5%8D%E0%A4%AF_%E0%A4%9C%E0%A5%8D%E0%A4%9E%E0%A4%BE%E0%A4%A8_{PAGE_NO}"
response = requests.post(
    url,
    headers=headers,
    cookies=cookies,
    timeout=30
)

print("Status Code:", response.status_code)
print("Response Text:")
print(response.text)

# If JSON is expected
try:
    print("Parsed JSON:")
    print(response.json())
except ValueError:
    print("Response is not valid JSON")
