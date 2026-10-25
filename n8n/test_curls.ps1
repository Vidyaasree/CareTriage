# =====================================================================
# CareTriage n8n MVP - Automated Webhook Test Suite
# Tests all error scenarios and the core deterministic triage evaluation
# =====================================================================

param (
    [string]$BaseUrl = "http://localhost:5678/webhook-test/triage-evaluate"
)

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " CareTriage n8n MVP Test Suite: $BaseUrl" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# Helper function
function Test-TriageEndpoint {
    param (
        [string]$TestName,
        [string]$Payload,
        [int]$ExpectedStatus
    )

    Write-Host "`n>>> Running: $TestName" -ForegroundColor Yellow
    try {
        $response = Invoke-RestMethod -Uri $BaseUrl -Method POST -Body $Payload -ContentType "application/json" -ErrorAction Stop
        Write-Host "Response (HTTP 200 OK):" -ForegroundColor Green
        $response | ConvertTo-Json -Depth 5 | Write-Host
        if ($ExpectedStatus -eq 200) {
            Write-Host "ASSERTION PASSED: Received HTTP 200" -ForegroundColor Green
        } else {
            Write-Host "ASSERTION FAILED: Expected $ExpectedStatus but got 200" -ForegroundColor Red
        }
    } catch {
        $statusCode = 0
        $body = ""
        if ($_.Exception.Response) {
            $statusCode = [int]$_.Exception.Response.StatusCode
            try {
                $stream = $_.Exception.Response.GetResponseStream()
                if ($stream) {
                    $reader = New-Object System.IO.StreamReader($stream)
                    $body = $reader.ReadToEnd()
                }
            } catch {
                # Fallback for PowerShell Core
            }
        }
        if (-not $body -and $_.ErrorDetails) {
            $body = $_.ErrorDetails.Message
        }
        if (-not $statusCode -and $_.Exception.StatusCode) {
            $statusCode = [int]$_.Exception.StatusCode
        }
        
        Write-Host "Response (HTTP $statusCode):" -ForegroundColor Magenta
        if ($body) { Write-Host $body }

        if ($statusCode -eq $ExpectedStatus) {
            Write-Host "ASSERTION PASSED: Received HTTP $statusCode as expected." -ForegroundColor Green
        } else {
            Write-Host "ASSERTION FAILED: Expected $ExpectedStatus but got $statusCode" -ForegroundColor Red
        }
    }
}

# TEST 1: Missing staff_id (Expect 400)
Test-TriageEndpoint -TestName "Test 1: Missing staff_id" `
    -Payload '{"class_id": "10A"}' `
    -ExpectedStatus 400

# TEST 2: Missing class_id (Expect 400)
Test-TriageEndpoint -TestName "Test 2: Missing class_id" `
    -Payload '{"staff_id": "22222222-2222-2222-2222-222222222222"}' `
    -ExpectedStatus 400

# TEST 3: Invalid Dates (Expect 400)
Test-TriageEndpoint -TestName "Test 3: Invalid Dates (start after end)" `
    -Payload '{
        "staff_id": "22222222-2222-2222-2222-222222222222",
        "class_id": "10A",
        "observation_period": { "start_date": "2026-10-25", "end_date": "2026-10-10" }
    }' `
    -ExpectedStatus 400

# TEST 4: Unauthorized Staff (TC3 - Sarah Davis querying 10B, Expect 403)
Test-TriageEndpoint -TestName "Test 4 (TC3): Unauthorized Staff (Teacher Sarah querying Class 10B)" `
    -Payload '{
        "staff_id": "22222222-2222-2222-2222-222222222222",
        "class_id": "10B",
        "observation_period": { "start_date": "2026-10-12", "end_date": "2026-10-23" }
    }' `
    -ExpectedStatus 403

# TEST 5: Unknown Student (Expect 404)
Test-TriageEndpoint -TestName "Test 5: Unknown Student ID" `
    -Payload '{
        "staff_id": "22222222-2222-2222-2222-222222222222",
        "class_id": "10A",
        "student_id": "00000000-0000-0000-0000-000000000999"
    }' `
    -ExpectedStatus 404

# TEST 6: Successful Triage Evaluation (TC1 & TC2, Expect 200)
Test-TriageEndpoint -TestName "Test 6 (TC1 & TC2): Authorized Teacher Sarah querying Class 10A" `
    -Payload '{
        "staff_id": "22222222-2222-2222-2222-222222222222",
        "class_id": "10A",
        "observation_period": { "start_date": "2026-10-12", "end_date": "2026-10-23" },
        "attendance_threshold": { "absence_threshold_count": 8, "window_days": 10 }
    }' `
    -ExpectedStatus 200
